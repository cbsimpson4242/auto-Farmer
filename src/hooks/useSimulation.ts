import { useState, useEffect, useCallback } from 'react'
import { SimState, StatsSnapshot, Drone, GeoPoint, Field } from '../types/simulation'

const TICK_MS = 100
const EARTH_METERS_PER_DEGREE_LAT = 111_320
const DEFAULT_FIELD_HEIGHT = 24
const CELL_SPACING_METERS = 28
const FERTILIZER_LITERS_PER_CELL = 1.6

function metersToLatitudeDegrees(meters: number) {
  return meters / EARTH_METERS_PER_DEGREE_LAT
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const metersPerDegree = EARTH_METERS_PER_DEGREE_LAT * Math.cos((latitude * Math.PI) / 180)
  return metersPerDegree === 0 ? 0 : meters / metersPerDegree
}

function distanceBetween(a: GeoPoint, b: GeoPoint) {
  const avgLat = (a.lat + b.lat) / 2
  const deltaLatMeters = (b.lat - a.lat) * EARTH_METERS_PER_DEGREE_LAT
  const deltaLonMeters = (b.lon - a.lon) * EARTH_METERS_PER_DEGREE_LAT * Math.cos((avgLat * Math.PI) / 180)
  const deltaHeight = (b.height ?? 0) - (a.height ?? 0)

  return Math.sqrt(deltaLatMeters ** 2 + deltaLonMeters ** 2 + deltaHeight ** 2)
}

function moveToward(current: GeoPoint, target: GeoPoint, distanceMeters: number) {
  const totalDistance = distanceBetween(current, target)
  if (totalDistance === 0 || totalDistance <= distanceMeters) {
    return { ...target }
  }

  const ratio = distanceMeters / totalDistance

  return {
    lat: current.lat + (target.lat - current.lat) * ratio,
    lon: current.lon + (target.lon - current.lon) * ratio,
    height: current.height + (target.height - current.height) * ratio,
  }
}

function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]) {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon
    const yi = polygon[i].lat
    const xj = polygon[j].lon
    const yj = polygon[j].lat

    const intersects = ((yi > point.lat) !== (yj > point.lat))
      && (point.lon < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi)

    if (intersects) inside = !inside
  }

  return inside
}

function createCellsForSpacing(boundary: GeoPoint[], spacingMeters: number, averageHeight: number) {
  const lats = boundary.map(point => point.lat)
  const lons = boundary.map(point => point.lon)
  const avgLat = lats.reduce((sum, lat) => sum + lat, 0) / boundary.length
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const latStep = metersToLatitudeDegrees(spacingMeters)
  const lonStep = metersToLongitudeDegrees(spacingMeters, avgLat)
  const cells: Field['cells'] = []

  let row = 0
  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    const rowCells: Field['cells'] = []

    for (let lon = minLon; lon <= maxLon; lon += lonStep) {
      const point = { lat, lon, height: Math.max(averageHeight, 0) + DEFAULT_FIELD_HEIGHT }
      if (pointInPolygon(point, boundary)) {
        rowCells.push({ point, state: 'empty' })
      }
    }

    if (row % 2 === 1) {
      rowCells.reverse()
    }

    cells.push(...rowCells)
    row += 1
  }

  return cells
}

function buildFieldCells(boundary: GeoPoint[]) {
  const lats = boundary.map(point => point.lat)
  const lons = boundary.map(point => point.lon)
  const avgLat = lats.reduce((sum, lat) => sum + lat, 0) / boundary.length
  const avgLon = lons.reduce((sum, lon) => sum + lon, 0) / boundary.length
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const averageHeight = boundary.reduce((sum, point) => sum + point.height, 0) / boundary.length
  const latSpanMeters = Math.max((maxLat - minLat) * EARTH_METERS_PER_DEGREE_LAT, 0)
  const lonSpanMeters = Math.max(
    (maxLon - minLon) * EARTH_METERS_PER_DEGREE_LAT * Math.cos((avgLat * Math.PI) / 180),
    0,
  )
  const maxSpanMeters = Math.max(latSpanMeters, lonSpanMeters)
  const spacingCandidates = [
    CELL_SPACING_METERS,
    Math.max(12, maxSpanMeters / 4),
    Math.max(6, maxSpanMeters / 8),
    3,
  ]

  for (const spacingMeters of spacingCandidates) {
    const cells = createCellsForSpacing(boundary, Math.min(CELL_SPACING_METERS, spacingMeters), averageHeight)
    if (cells.length > 0) {
      return cells
    }
  }

  const fallbackPoint = {
    lat: avgLat,
    lon: avgLon,
    height: Math.max(averageHeight, 0) + DEFAULT_FIELD_HEIGHT,
  }

  if (pointInPolygon(fallbackPoint, boundary)) {
    return [{ point: fallbackPoint, state: 'empty' as const }]
  }

  return []
}

function computeCoverage(field: Field) {
  if (field.traversableCount === 0) return 0
  return field.cells.filter(cell => cell.state === 'covered').length / field.traversableCount
}

function extractSnapshot(sim: SimState): StatsSnapshot {
  const fieldCoverage = sim.fields.map(field => ({
    id: field.id,
    label: field.label,
    coverage: computeCoverage(field),
  }))
  const traversableTotal = sim.fields.reduce((sum, field) => sum + field.traversableCount, 0)
  const coveredTotal = sim.fields.reduce(
    (sum, field) => sum + field.cells.filter(cell => cell.state === 'covered').length,
    0,
  )

  return {
    elapsedMs: sim.elapsedMs,
    totalCoverage: traversableTotal === 0 ? 0 : coveredTotal / traversableTotal,
    fieldCoverage,
    drones: sim.drones.map(d => ({
      id: d.id,
      status: d.status,
      batteryLevel: d.batteryLevel,
      cellsCovered: d.cellsCovered,
    })),
    totalFertilizer: sim.drones.reduce((sum, drone) => sum + drone.fertilizerDispensed, 0),
  }
}

function buildDroneAssignments(fields: Field[], droneCount: number, base: GeoPoint) {
  const assignments = Array.from({ length: droneCount }, (_, index) => ({
    droneId: index,
    segments: [] as { fieldId: number; point: GeoPoint; cellIndex: number }[],
  }))

  let nextDrone = 0
  for (const field of fields) {
    field.cells.forEach((cell, cellIndex) => {
      if (cell.state !== 'empty') return
      assignments[nextDrone].segments.push({ fieldId: field.id, point: cell.point, cellIndex })
      nextDrone = (nextDrone + 1) % droneCount
    })
  }

  return assignments.map(({ droneId, segments }) => {
    if (segments.length === 0) {
      return createDrone(droneId, base)
    }

    const firstTarget = segments[0].point

    return {
      ...createDrone(droneId, base),
      status: 'flying_to_field' as const,
      targetPosition: { ...firstTarget },
      route: {
        fieldId: segments[0].fieldId,
        fieldIds: segments.map(segment => segment.fieldId),
        waypoints: segments.map(segment => segment.point),
        cellIndexes: segments.map(segment => segment.cellIndex),
        waypointIndex: 0,
      },
    }
  })
}

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
    drones: Array.from({ length: 3 }, (_, i) => createDrone(i, { lat: 41.6005, lon: -93.6091, height: 0 })),
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

  useEffect(() => {
    setSim(prev => {
      const nextDrones = Array.from({ length: prev.droneCount }, (_, i) => {
        const existingDrone = prev.drones[i]
        return existingDrone ? existingDrone : createDrone(i, prev.base.position)
      })

      return {
        ...prev,
        drones: nextDrones,
        statsSnapshot: extractSnapshot({ ...prev, drones: nextDrones }),
      }
    })
  }, [sim.droneCount])

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

      const fieldCells = buildFieldCells(currentPoints)

      const newField: Field = {
        id: sim.fields.length,
        label: `Field ${String.fromCharCode(65 + sim.fields.length)}`,
        boundary: [...currentPoints],
        cells: fieldCells,
        traversableCount: fieldCells.length,
      }

       setSim(prev => {
         const nextFields = [...prev.fields, newField]
         return {
           ...prev,
           mode: 'simulating',
           fields: nextFields,
           statsSnapshot: extractSnapshot({ ...prev, mode: 'simulating', fields: nextFields }),
         }
       })
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
        let nextFields = prev.fields.map(field => ({
          ...field,
          cells: field.cells.map(cell => ({ ...cell })),
        }))

        const nextDrones: Drone[] = prev.drones.map((drone): Drone => {
          if (!drone.route || drone.route.waypoints.length === 0) {
            if (drone.status === 'returning') {
              const distanceStep = drone.speed * prev.speedMultiplier * (TICK_MS / 1000)
              const nextPosition = moveToward(drone.position, prev.base.position, distanceStep)
              const atBase = distanceBetween(nextPosition, prev.base.position) < 1
              return {
                ...drone,
                position: nextPosition,
                targetPosition: { ...prev.base.position },
                status: atBase ? 'idle' : 'returning',
              }
            }

            return { ...drone, status: 'idle', targetPosition: { ...prev.base.position } }
          }

          const waypointIndex = drone.route.waypointIndex
          const activeTarget = drone.route.waypoints[waypointIndex]
          const distanceStep = drone.speed * prev.speedMultiplier * (TICK_MS / 1000)
          const nextPosition = moveToward(drone.position, activeTarget, distanceStep)
          const reachedTarget = distanceBetween(nextPosition, activeTarget) < 1

          if (!reachedTarget) {
            return {
              ...drone,
              position: nextPosition,
              targetPosition: activeTarget,
              status: waypointIndex === 0 ? 'flying_to_field' : 'working',
            }
          }

          const activeFieldId = drone.route.fieldIds[waypointIndex] ?? drone.route.fieldId
          const fieldIndex = nextFields.findIndex(field => field.id === activeFieldId)
          let cellsCovered = drone.cellsCovered
          let fertilizerDispensed = drone.fertilizerDispensed

          if (fieldIndex >= 0) {
            const cellIndex = drone.route.cellIndexes[waypointIndex]
            const targetCell = nextFields[fieldIndex].cells[cellIndex]

            if (targetCell && targetCell.state !== 'covered') {
              nextFields[fieldIndex].cells[cellIndex] = { ...targetCell, state: 'covered' }
              cellsCovered += 1
              fertilizerDispensed += FERTILIZER_LITERS_PER_CELL
            }
          }

          const nextWaypointIndex = waypointIndex + 1
          if (nextWaypointIndex >= drone.route.waypoints.length) {
            return {
              ...drone,
              position: { ...activeTarget },
              targetPosition: { ...prev.base.position },
              status: 'returning',
              route: null,
              cellsCovered,
              fertilizerDispensed,
              batteryLevel: Math.max(0.2, drone.batteryLevel - drone.batteryDrainPerCell),
            }
          }

          const nextTarget = drone.route.waypoints[nextWaypointIndex]
          return {
            ...drone,
            position: { ...activeTarget },
            targetPosition: nextTarget,
            route: {
              ...drone.route,
              waypointIndex: nextWaypointIndex,
              fieldId: drone.route.fieldIds[nextWaypointIndex] ?? drone.route.fieldId,
            },
            status: 'working',
            cellsCovered,
            fertilizerDispensed,
            batteryLevel: Math.max(0.2, drone.batteryLevel - drone.batteryDrainPerCell),
          }
        })

        const allComplete = nextFields.every(field => field.cells.every(cell => cell.state === 'covered'))
        const allDronesIdle = nextDrones.every(drone => drone.status === 'idle')
        const nextState: SimState = {
          ...prev,
          elapsedMs: prev.elapsedMs + TICK_MS,
          fields: nextFields,
          drones: nextDrones,
          running: allComplete && allDronesIdle ? false : prev.running,
          paused: allComplete && allDronesIdle ? false : prev.paused,
        }

        return {
          ...nextState,
          statsSnapshot: extractSnapshot(nextState),
        }
      })
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [sim.running, sim.paused])

  const onStart = useCallback(() => {
    setSim(prev => {
      const hasActiveRoutes = prev.drones.some(drone => drone.route || drone.status === 'returning')
      const nextDrones = hasActiveRoutes
        ? prev.drones
        : buildDroneAssignments(prev.fields, prev.droneCount, prev.base.position)

      const nextState = {
        ...prev,
        running: true,
        paused: false,
        drones: nextDrones,
      }

      return {
        ...nextState,
        statsSnapshot: extractSnapshot(nextState),
      }
    })
  }, [])

  const onPause = useCallback(() => setSim(prev => ({ ...prev, paused: !prev.paused })), [])
  const onReset = useCallback(() => {
    setCurrentPoints([])

    setSim(prev => {
    const resetDrones = Array.from({ length: prev.droneCount }, (_, i) => createDrone(i, prev.base.position))

    return {
      ...prev,
      running: false,
      paused: false,
      elapsedMs: 0,
      fields: [],
      drones: resetDrones,
      mode: 'simulating',
      statsSnapshot: extractSnapshot({ ...prev, elapsedMs: 0, fields: [], drones: resetDrones }),
    }
    })
  }, [])
  const onSpeedChange = useCallback((s: number) => setSim(prev => ({ ...prev, speedMultiplier: s })), [])
  const onDroneCountChange = useCallback((c: number) => setSim(prev => ({ ...prev, droneCount: c })), [])

  return {
    sim,
    currentPoints,
    onAddPoint,
    onCompleteField,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
  }
}
