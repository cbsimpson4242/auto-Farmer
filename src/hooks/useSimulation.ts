import { useRef, useState, useEffect, useCallback } from 'react'
import { SimState, StatsSnapshot, Drone, Vec2 } from '../types/simulation'
import { createFields, createBase, getCanvasSize } from '../simulation/fieldLayout'
import { computeSweepPath } from '../simulation/pathPlanner'
import { tickDrone } from '../simulation/droneStateMachine'
import { BATTERY_DRAIN_PER_CELL, DRONE_SPEED, FERTILIZER_PER_CELL, COLORS } from '../simulation/constants'
import { renderField } from '../rendering/renderField'
import { renderDrone } from '../rendering/renderDrone'
import { renderBase } from '../rendering/renderBase'
import { renderHUD } from '../rendering/renderHUD'

function createDrone(id: number, basePx: Vec2): Drone {
  return {
    id,
    status: 'idle',
    px: { x: basePx.x + (id - 1) * 12, y: basePx.y },
    targetPx: { ...basePx },
    route: null,
    batteryLevel: 1.0,
    batteryDrainPerCell: BATTERY_DRAIN_PER_CELL,
    speed: DRONE_SPEED,
    moveProgress: 0,
    cellsCovered: 0,
    fertilizerDispensed: 0,
    trail: [],
  }
}

function createInitialSimState(droneCount: number): SimState {
  const fields = createFields()
  const base = createBase(fields)
  const drones = Array.from({ length: droneCount }, (_, i) => createDrone(i, base.px))

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
    statsSnapshot: extractSnapshot({ fields, drones, elapsedMs: 0 } as any),
  }
}

function initWorkQueues(sim: SimState): void {
  sim.fieldWorkQueues.clear()
  for (const field of sim.fields) {
    const sweep = computeSweepPath(field)
    sim.fieldWorkQueues.set(field.id, sweep)
  }
}

function extractSnapshot(sim: SimState): StatsSnapshot {
  const fieldCoverage = sim.fields.map(f => {
    let covered = 0
    for (const c of f.cells) if (c === 'covered') covered++
    return {
      id: f.id,
      label: f.label,
      coverage: f.traversableCount > 0 ? covered / f.traversableCount : 1,
    }
  })

  const totalTraversable = sim.fields.reduce((s, f) => s + f.traversableCount, 0)
  const totalCovered = sim.fields.reduce((s, f) => {
    let c = 0
    for (const cell of f.cells) if (cell === 'covered') c++
    return s + c
  }, 0)

  return {
    elapsedMs: sim.elapsedMs,
    totalCoverage: totalTraversable > 0 ? totalCovered / totalTraversable : 1,
    fieldCoverage,
    drones: sim.drones.map(d => ({
      id: d.id,
      status: d.status,
      batteryLevel: d.batteryLevel,
      cellsCovered: d.cellsCovered,
    })),
    totalFertilizer: sim.drones.reduce((s, d) => s + d.fertilizerDispensed, 0),
  }
}

function tick(sim: SimState, deltaMs: number): void {
  sim.elapsedMs += deltaMs
  for (const drone of sim.drones) {
    tickDrone(drone, sim, deltaMs)
  }
}

function render(ctx: CanvasRenderingContext2D, sim: SimState): void {
  const canvas = ctx.canvas
  ctx.fillStyle = COLORS.background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  renderBase(ctx, sim.base, sim.droneCount)

  for (const field of sim.fields) {
    renderField(ctx, field)
  }

  for (const drone of sim.drones) {
    renderDrone(ctx, drone)
  }

  renderHUD(ctx, sim)
}

export function useSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<SimState>(createInitialSimState(3))
  const [snapshot, setSnapshot] = useState<StatsSnapshot>(() => extractSnapshot(simRef.current))
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(simRef.current.speedMultiplier)

  // Set canvas size based on field layout
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sim = simRef.current
    const size = getCanvasSize(sim.fields, sim.base)
    canvas.width = size.width
    canvas.height = size.height
  }, [])

  // RAF loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    let lastTime = 0
    let frameCount = 0
    let animId = 0

    function loop(now: number) {
      if (lastTime === 0) lastTime = now
      const rawDelta = now - lastTime
      lastTime = now
      const delta = Math.min(rawDelta, 100)

      const sim = simRef.current
      if (sim.running && !sim.paused) {
        tick(sim, delta * sim.speedMultiplier)
        frameCount++
        if (frameCount % 6 === 0) {
          setSnapshot(extractSnapshot(sim))
        }
      }

      render(ctx, sim)
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [])

  const onStart = useCallback(() => {
    const sim = simRef.current
    if (!sim.running) {
      initWorkQueues(sim)
      sim.running = true
      sim.paused = false
      setIsRunning(true)
      setIsPaused(false)
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
    }
  }, [])

  const onReset = useCallback(() => {
    const droneCount = simRef.current.droneCount
    const speedMultiplier = simRef.current.speedMultiplier
    const newSim = createInitialSimState(droneCount)
    newSim.speedMultiplier = speedMultiplier
    simRef.current = newSim
    setSnapshot(extractSnapshot(newSim))
    setIsRunning(false)
    setIsPaused(false)
    setSpeedMultiplier(speedMultiplier)

    // Resize canvas
    const canvas = canvasRef.current
    if (canvas) {
      const size = getCanvasSize(newSim.fields, newSim.base)
      canvas.width = size.width
      canvas.height = size.height
    }
  }, [])

  const onSpeedChange = useCallback((multiplier: number) => {
    simRef.current.speedMultiplier = multiplier
    setSpeedMultiplier(multiplier)
  }, [])

  const onDroneCountChange = useCallback((count: number) => {
    const sim = simRef.current
    if (sim.running) return // can't change during simulation
    const newSim = createInitialSimState(count)
    newSim.speedMultiplier = sim.speedMultiplier
    simRef.current = newSim
    setSnapshot(extractSnapshot(newSim))
  }, [])

  return {
    canvasRef,
    snapshot,
    isRunning,
    isPaused,
    speedMultiplier,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
  }
}
