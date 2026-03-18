import { useRef, useState, useEffect, useCallback } from 'react'
import { SimState, StatsSnapshot, Drone, Coordinate } from '../types/simulation'
import { createFields, createBase } from '../simulation/fieldLayout'
import { computeSweepPath } from '../simulation/pathPlanner'
import { tickDrone } from '../simulation/droneStateMachine'
import { BATTERY_DRAIN_PER_CELL, DRONE_SPEED } from '../simulation/constants'

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
    fieldCoverage,
    drones: sim.drones.map(drone => ({
      id: drone.id,
      status: drone.status,
      batteryLevel: drone.batteryLevel,
      cellsCovered: drone.cellsCovered,
    })),
    totalFertilizer: sim.drones.reduce((sum, drone) => sum + drone.fertilizerDispensed, 0),
  }
}

function createInitialSimState(droneCount: number): SimState {
  const fields = createFields()
  const base = createBase(fields)
  const drones = Array.from({ length: droneCount }, (_, index) => createDrone(index, base.position))

  return {
    running: false,
    paused: false,
    elapsedMs: 0,
    speedMultiplier: 1,
    droneCount,
    fields,
    base,
    drones,
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
      fieldWorkQueues: new Map(),
      statsSnapshot: {} as StatsSnapshot,
    }),
  }
}

function initWorkQueues(sim: SimState): void {
  sim.fieldWorkQueues.clear()
  for (const field of sim.fields) {
    sim.fieldWorkQueues.set(field.id, computeSweepPath(field))
  }
}

function tick(sim: SimState, deltaMs: number): void {
  sim.elapsedMs += deltaMs
  for (const drone of sim.drones) {
    tickDrone(drone, sim, deltaMs)
  }
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
    if (!sim.running) {
      initWorkQueues(sim)
      sim.running = true
      sim.paused = false
      setIsRunning(true)
      setIsPaused(false)
      setSnapshot(extractSnapshot(sim))
    } else if (sim.paused) {
      sim.paused = false
      setIsPaused(false)
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
    simRef.current = nextSim
    setSnapshot(extractSnapshot(nextSim))
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
  }
}
