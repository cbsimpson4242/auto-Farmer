export type CellState = 'empty' | 'covered' | 'obstacle'
export type DroneStatus = 'idle' | 'flying_to_field' | 'working' | 'returning' | 'charging'

export interface Vec2 {
  x: number
  y: number
}

export interface Field {
  id: number
  label: string
  originPx: Vec2
  cols: number
  rows: number
  cellSize: number
  cells: CellState[]
  obstacleSet: Set<string>
  traversableCount: number
}

export interface DroneRoute {
  fieldId: number
  waypoints: Vec2[]
  waypointIndex: number
}

export interface Drone {
  id: number
  status: DroneStatus
  px: Vec2
  targetPx: Vec2
  route: DroneRoute | null
  batteryLevel: number       // 0.0 – 1.0
  batteryDrainPerCell: number
  speed: number              // pixels/sec
  moveProgress: number       // 0.0 – 1.0 interpolation
  cellsCovered: number
  fertilizerDispensed: number
  trail: Vec2[]              // last N positions for rendering
}

export interface BaseStation {
  px: Vec2
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
  running: boolean
  paused: boolean
  elapsedMs: number
  speedMultiplier: number
  droneCount: number
  fields: Field[]
  base: BaseStation
  drones: Drone[]
  fieldWorkQueues: Map<number, Vec2[]>
  statsSnapshot: StatsSnapshot
}
