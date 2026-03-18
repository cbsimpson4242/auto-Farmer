import { useRef, useState, useEffect, useCallback } from 'react'
import { SimState, StatsSnapshot, Drone, GeoPoint, Field } from '../types/simulation'

function createDrone(id: number, basePos: GeoPoint): Drone {
  return {
    id,
    status: 'idle',
    position: { ...basePos },
    targetPosition: { ...basePos },
    route: null,
    batteryLevel: 1.0,
    batteryDrainPerCell: 0.005,
    speed: 15, // meters/sec
    moveProgress: 0,
    cellsCovered: 0,
    fertilizerDispensed: 0,
  }
}

function extractSnapshot(sim: SimState): StatsSnapshot {
  return {
    elapsedMs: sim.elapsedMs,
    totalCoverage: 0,
    fieldCoverage: sim.fields.map(f => ({ id: f.id, label: f.label, coverage: 0 })),
    drones: sim.drones.map(d => ({
      id: d.id,
      status: d.status,
      batteryLevel: d.batteryLevel,
      cellsCovered: d.cellsCovered,
    })),
    totalFertilizer: sim.drones.reduce((s, d) => s + d.fertilizerDispensed, 0),
  }
}

export function useSimulation() {
  const [sim, setSim] = useState<SimState>(() => ({
    mode: 'simulating',
    running: false,
    paused: false,
    elapsedMs: 0,
    speedMultiplier: 1,
    droneCount: 3,
    fields: [],
    base: { position: { lat: 41.6005, lon: -93.6091, height: 0 }, label: 'Base' },
    drones: [],
    fieldWorkQueues: new Map(),
    statsSnapshot: {
      elapsedMs: 0,
      totalCoverage: 0,
      fieldCoverage: [],
      drones: [],
      totalFertilizer: 0,
    },
  }))

  const [currentPoints, setCurrentPoints] = useState<GeoPoint[]>([])

  const onAddPoint = useCallback((point: GeoPoint) => {
    setCurrentPoints(prev => [...prev, point])
  }, [])

  const onStartMapping = useCallback(() => {
    setSim(prev => ({ ...prev, mode: 'mapping' }))
    setCurrentPoints([])
  }, [])

  const onCompleteField = useCallback(() => {
    if (sim.mode === 'mapping') {
      if (currentPoints.length < 3) {
        setSim(prev => ({ ...prev, mode: 'simulating' }))
        return
      }

      const newField: Field = {
        id: sim.fields.length,
        label: `Field ${String.fromCharCode(65 + sim.fields.length)}`,
        boundary: [...currentPoints],
        cells: [],
        traversableCount: 100,
      }

      setSim(prev => ({
        ...prev,
        mode: 'simulating',
        fields: [...prev.fields, newField],
      }))
      setCurrentPoints([])
    } else {
      onStartMapping()
    }
  }, [sim.mode, currentPoints])

  // Simple simulation tick
  useEffect(() => {
    if (!sim.running || sim.paused) return

    const interval = setInterval(() => {
      setSim(prev => {
        const nextDrones = prev.drones.map(d => {
          // Move toward target logic would go here
          return { ...d, batteryLevel: Math.max(0, d.batteryLevel - 0.001) }
        })
        return {
          ...prev,
          elapsedMs: prev.elapsedMs + 100,
          drones: nextDrones,
          statsSnapshot: extractSnapshot({ ...prev, drones: nextDrones }),
        }
      })
    }, 100)

    return () => clearInterval(interval)
  }, [sim.running, sim.paused])

  const onStart = useCallback(() => {
    setSim(prev => ({
      ...prev,
      running: true,
      paused: false,
      drones: prev.drones.length > 0 ? prev.drones : Array.from({ length: prev.droneCount }, (_, i) => createDrone(i, prev.base.position))
    }))
  }, [])

  const onPause = useCallback(() => setSim(prev => ({ ...prev, paused: !prev.paused })), [])
  const onReset = useCallback(() => setSim(prev => ({ ...prev, running: false, paused: false, elapsedMs: 0, fields: [], drones: [] })), [])
  const onSpeedChange = useCallback((s: number) => setSim(prev => ({ ...prev, speedMultiplier: s })), [])
  const onDroneCountChange = useCallback((c: number) => setSim(prev => ({ ...prev, droneCount: c })), [])

  return {
    sim,
    onAddPoint,
    onCompleteField,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
  }
}
