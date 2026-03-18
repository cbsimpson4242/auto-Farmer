import { useRef, useState, useEffect, useCallback } from 'react'
import { SimState, StatsSnapshot, Drone, Coordinate } from '../types/simulation'
import { createFields, createBase } from '../simulation/fieldLayout'
import { tickDrone } from '../simulation/droneStateMachine'
import { BATTERY_DRAIN_PER_CELL, DRONE_SPEED } from '../simulation/constants'
import { buildFieldQueue } from '../simulation/workPartitioner'

function createDrone(id: number, basePosition: Coordinate): Drone {
  return {
    id,
    status: 'idle',
    position: {
      lng: basePosition.lng + id * 0.00005,
      lat: basePosition.lat,
    },
    targetPosition: { ...basePosition },
    route: null,
    batteryLevel: 1.0,
    batteryDrainPerCell: BATTERY_DRAIN_PER_CELL,
    speed: DRONE_SPEED,
    cellsCovered: 0,
    fertilizerDispensed: 0,
    trail: [],
  }
}

function extractSnapshot(sim: SimState): StatsSnapshot {
  const targetField = sim.mission.targetFieldId == null ? null : sim.fields[sim.mission.targetFieldId]
  const pendingField = sim.mission.pendingFieldId == null ? null : sim.fields[sim.mission.pendingFieldId]

  const fieldCoverage = sim.fields.map(field => {
    let covered = 0
    for (const cell of field.cells) if (cell === 'covered') covered++

    return {
      id: field.id,
      label: field.label,
      crop: field.crop,
      coverage: field.traversableCount > 0 ? covered / field.traversableCount : 1,
      treatedAreaHa: covered * field.cellAreaHa,
      totalAreaHa: field.totalAreaHa,
      targetLiters: field.totalAreaHa * field.applicationRateLHa,
      appliedLiters: covered * field.fertilizerPerCellLiters,
    }
  })

  const totalTraversable = sim.fields.reduce((sum, field) => sum + field.traversableCount, 0)
  const totalCovered = sim.fields.reduce((sum, field) => {
    let covered = 0
    for (const cell of field.cells) if (cell === 'covered') covered++
    return sum + covered
  }, 0)

  return {
    elapsedMs: sim.elapsedMs,
    totalCoverage: totalTraversable > 0 ? totalCovered / totalTraversable : 1,
    mission: {
      targetFieldId: sim.mission.targetFieldId,
      pendingFieldId: sim.mission.pendingFieldId,
      status: sim.mission.status,
      targetFieldLabel: targetField?.label ?? null,
      pendingFieldLabel: pendingField?.label ?? null,
    },
    fieldCoverage,
    drones: sim.drones.map(drone => ({
      id: drone.id,
      status: drone.status,
      batteryLevel: drone.batteryLevel,
      cellsCovered: drone.cellsCovered,
      assignedFieldId: drone.route?.fieldId ?? null,
      assignedFieldLabel: drone.route ? sim.fields[drone.route.fieldId]?.label ?? null : null,
      routeProgress: !drone.route || drone.route.waypoints.length === 0
        ? 0
        : drone.route.completedCount / drone.route.waypoints.length,
    })),
    totalFertilizer: sim.drones.reduce((sum, drone) => sum + drone.fertilizerDispensed, 0),
  }
}

function createInitialSimState(droneCount: number): SimState {
  const fields = createFields()
  const base = createBase(fields)
  const drones = Array.from({ length: droneCount }, (_, index) => createDrone(index, base.position))
  const mission = {
    targetFieldId: fields[0]?.id ?? null,
    pendingFieldId: null,
    status: fields.length > 0 ? 'ready' as const : 'idle' as const,
  }

  return {
    running: false,
    paused: false,
    elapsedMs: 0,
    speedMultiplier: 1,
    droneCount,
    fields,
    base,
    drones,
    mission,
    fieldWorkQueues: new Map(),
    statsSnapshot: extractSnapshot({
      running: false,
      paused: false,
      elapsedMs: 0,
      speedMultiplier: 1,
      droneCount,
      fields,
      base,
      drones,
      mission,
      fieldWorkQueues: new Map(),
      statsSnapshot: {} as StatsSnapshot,
    }),
  }
}

function initWorkQueues(sim: SimState): void {
  sim.fieldWorkQueues.clear()
  if (sim.mission.targetFieldId == null) return
  const field = sim.fields[sim.mission.targetFieldId]
  sim.fieldWorkQueues.set(field.id, buildFieldQueue(field))
}

function allDronesSafeForRetask(sim: SimState): boolean {
  return sim.drones.every(drone => drone.status === 'idle' || drone.status === 'charging')
}

function activateMissionField(sim: SimState, fieldId: number): void {
  sim.mission.targetFieldId = fieldId
  sim.mission.pendingFieldId = null
  sim.mission.status = sim.running ? 'running' : 'ready'
  for (const drone of sim.drones) {
    if (drone.status === 'idle') {
      drone.route = null
      drone.targetPosition = { ...sim.base.position }
    }
  }
  initWorkQueues(sim)
}

function syncMissionState(sim: SimState): void {
  if (sim.mission.pendingFieldId != null && allDronesSafeForRetask(sim)) {
    activateMissionField(sim, sim.mission.pendingFieldId)
  }

  if (sim.mission.pendingFieldId != null) {
    sim.mission.status = 'retasking'
  } else if (!sim.running) {
    sim.mission.status = sim.mission.targetFieldId == null ? 'idle' : 'ready'
  } else {
    sim.mission.status = sim.mission.targetFieldId == null ? 'idle' : 'running'
  }
}

function tick(sim: SimState, deltaMs: number): void {
  sim.elapsedMs += deltaMs
  for (const drone of sim.drones) {
    tickDrone(drone, sim, deltaMs)
  }
  syncMissionState(sim)
}

export function useSimulation() {
  const simRef = useRef<SimState>(createInitialSimState(3))
  const [snapshot, setSnapshot] = useState<StatsSnapshot>(() => extractSnapshot(simRef.current))
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let lastTime = 0
    let frameCount = 0
    let animationId = 0

    function loop(now: number) {
      if (lastTime === 0) lastTime = now
      const rawDelta = now - lastTime
      lastTime = now
      const delta = Math.min(rawDelta, 100)

      const sim = simRef.current
      if (sim.running && !sim.paused) {
        tick(sim, delta * sim.speedMultiplier)
        frameCount++
        if (frameCount % 2 === 0) {
          setSnapshot(extractSnapshot(sim))
        }
      }

      animationId = requestAnimationFrame(loop)
    }

    animationId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const onStart = useCallback(() => {
    const sim = simRef.current
    if (sim.mission.targetFieldId == null) return

    if (!sim.running) {
      initWorkQueues(sim)
      sim.running = true
      sim.paused = false
      sim.mission.status = 'running'
      setIsRunning(true)
      setIsPaused(false)
      setSnapshot(extractSnapshot(sim))
    } else if (sim.paused) {
      sim.paused = false
      setIsPaused(false)
      setSnapshot(extractSnapshot(sim))
    }
  }, [])

  const onPause = useCallback(() => {
    const sim = simRef.current
    if (sim.running && !sim.paused) {
      sim.paused = true
      setIsPaused(true)
      setSnapshot(extractSnapshot(sim))
    }
  }, [])

  const onReset = useCallback(() => {
    const droneCount = simRef.current.droneCount
    const speedMultiplier = simRef.current.speedMultiplier
    const nextSim = createInitialSimState(droneCount)
    nextSim.speedMultiplier = speedMultiplier
    simRef.current = nextSim
    setSnapshot(extractSnapshot(nextSim))
    setIsRunning(false)
    setIsPaused(false)
  }, [])

  const onSpeedChange = useCallback((multiplier: number) => {
    simRef.current.speedMultiplier = multiplier
  }, [])

  const onDroneCountChange = useCallback((count: number) => {
    const sim = simRef.current
    if (sim.running) return
    const nextSim = createInitialSimState(count)
    nextSim.speedMultiplier = sim.speedMultiplier
    nextSim.mission.targetFieldId = sim.mission.targetFieldId
    nextSim.mission.status = nextSim.mission.targetFieldId == null ? 'idle' : 'ready'
    if (nextSim.mission.targetFieldId != null) initWorkQueues(nextSim)
    simRef.current = nextSim
    setSnapshot(extractSnapshot(nextSim))
  }, [])

  const onTargetFieldChange = useCallback((fieldId: number) => {
    const sim = simRef.current
    if (!sim.fields.some(field => field.id === fieldId)) return

    if (!sim.running) {
      activateMissionField(sim, fieldId)
    } else if (sim.mission.targetFieldId !== fieldId) {
      sim.mission.pendingFieldId = fieldId
      sim.mission.status = 'retasking'
      for (const drone of sim.drones) {
        if (drone.status === 'idle') {
          drone.route = null
          drone.targetPosition = { ...sim.base.position }
        }
      }
    }

    setSnapshot(extractSnapshot(sim))
  }, [])

  return {
    sim: simRef.current,
    snapshot,
    isRunning,
    isPaused,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
    onTargetFieldChange,
  }
}
