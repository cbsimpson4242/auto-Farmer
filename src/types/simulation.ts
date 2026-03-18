export type CellState = 'empty' | 'covered' | 'obstacle'
export type DroneStatus = 'idle' | 'flying_to_field' | 'working' | 'returning' | 'charging'

export interface Vec2 {
  x: number
  y: number
}

export interface Coordinate {
  lng: number
  lat: number
}

export interface GeoBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface ExclusionZone {
  id: string
  label: string
  polygon: Coordinate[]
}

export interface Field {
  id: number
  label: string
  crop: string
  applicationRateLHa: number
  polygon: Coordinate[]
  exclusions: ExclusionZone[]
  bounds: GeoBounds
  projectionCenter: Coordinate
  gridOriginMeters: Vec2
  cols: number
  rows: number
  cellSizeMeters: number
  cellAreaHa: number
  totalAreaHa: number
  fertilizerPerCellLiters: number
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
  position: Coordinate
  targetPosition: Coordinate
  route: DroneRoute | null
  batteryLevel: number
  batteryDrainPerCell: number
  speed: number
  cellsCovered: number
  fertilizerDispensed: number
  trail: Coordinate[]
}

export interface BaseStation {
  position: Coordinate
  label: string
}

export interface StatsSnapshot {
  elapsedMs: number
  totalCoverage: number
  fieldCoverage: {
    id: number
    label: string
    crop: string
    coverage: number
    treatedAreaHa: number
    totalAreaHa: number
    targetLiters: number
    appliedLiters: number
  }[]
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
