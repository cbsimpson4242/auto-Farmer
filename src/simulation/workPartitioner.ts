import { SimState, Drone, Vec2, DroneRoute, Field, Coordinate } from '../types/simulation'
import { cellToCoordinate } from './geo'

export function buildFieldQueue(field: Field): Vec2[] {
  const queue: Vec2[] = []

  for (let row = 0; row < field.rows; row++) {
    const rowCells: Vec2[] = []
    for (let col = 0; col < field.cols; col++) {
      const index = row * field.cols + col
      if (field.cells[index] === 'empty' && !field.obstacleSet.has(`${col},${row}`)) {
        rowCells.push({ x: col, y: row })
      }
    }
    if (row % 2 === 1) rowCells.reverse()
    queue.push(...rowCells)
  }

  return queue
}

/**
 * Try to assign work to an idle drone.
 * Returns true if work was assigned.
 */
export function tryAssignWork(sim: SimState, drone: Drone): boolean {
  if (drone.route && drone.route.waypointIndex < drone.route.waypoints.length) {
    return true
  }

  const bestFieldId = sim.mission.targetFieldId
  if (bestFieldId == null) return false

  const queue = sim.fieldWorkQueues.get(bestFieldId)
  if (!queue || queue.length === 0) return false

  const idleCount = sim.drones.filter(d => d.status === 'idle').length
  const field = sim.fields[bestFieldId]
  const minChunk = Math.max(10, Math.round(field.traversableCount / Math.max(1, field.rows)))
  const chunkSize = Math.max(minChunk, Math.ceil(queue.length / Math.max(1, idleCount)))
  const claimed = queue.splice(0, Math.min(chunkSize, queue.length))

  if (claimed.length === 0) return false

  const route: DroneRoute = {
    fieldId: bestFieldId,
    waypoints: claimed,
    waypointIndex: 0,
    completedCount: 0,
  }
  drone.route = route
  return true
}

export function cellToPosition(field: Field, col: number, row: number): Coordinate {
  return cellToCoordinate(field, col, row)
}
