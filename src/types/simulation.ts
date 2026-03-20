export type CellState = 'empty' | 'covered' | 'obstacle'
export type DroneStatus = 'idle' | 'flying_to_field' | 'working' | 'returning' | 'charging'

export interface GeoPoint {
  lat: number
  lon: number
  height: number
}

export interface Field {
  id: number
  label: string
  // Polygon perimeter points
  boundary: GeoPoint[]
  // Simulation grid in 3D
  cells: {
    point: GeoPoint
    state: CellState
  }[]
  traversableCount: number
}

export interface DroneRoute {
  fieldId: number
  fieldIds: number[]
  waypoints: GeoPoint[]
  cellIndexes: number[]
  waypointIndex: number
}

export interface Drone {
  id: number
  status: DroneStatus
  position: GeoPoint
  targetPosition: GeoPoint
  route: DroneRoute | null
  batteryLevel: number       // 0.0 – 1.0
  batteryDrainPerCell: number
  speed: number              // meters/sec
  moveProgress: number       // 0.0 – 1.0 interpolation
  cellsCovered: number
  fertilizerDispensed: number
}

export interface BaseStation {
  position: GeoPoint
  label: string
}

export interface StatsSnapshot {
  elapsedMs: number
  totalCoverage: number      // 0.0 – 1.0
  fieldCoverage: { id: number; label: string; coverage: number }[]
  drones: {
    id: number
    status: DroneStatus
    batteryLevel: number
    cellsCovered: number
  }[]
  totalFertilizer: number
}

export interface SimState {
  mode: 'mapping' | 'simulating'
  running: boolean
  paused: boolean
  elapsedMs: number
  speedMultiplier: number
  droneCount: number
  fields: Field[]
  base: BaseStation
  drones: Drone[]
  fieldWorkQueues: Map<number, GeoPoint[]>
  statsSnapshot: StatsSnapshot
}
