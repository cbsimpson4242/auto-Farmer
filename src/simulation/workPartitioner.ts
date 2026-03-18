import { SimState, Drone, Vec2, DroneRoute, Field, Coordinate } from '../types/simulation'
import { cellToCoordinate } from './geo'

/**
 * Try to assign work to an idle drone.
 * Returns true if work was assigned.
 */
export function tryAssignWork(sim: SimState, drone: Drone): boolean {
  // If drone has a partial route, resume it
  if (drone.route && drone.route.waypointIndex < drone.route.waypoints.length) {
    return true // already has work
  }

  // Find field with most remaining work
  let bestFieldId = -1
  let bestCount = 0
  for (const [fieldId, queue] of sim.fieldWorkQueues) {
    if (queue.length > bestCount) {
      bestCount = queue.length
      bestFieldId = fieldId
    }
  }

  if (bestFieldId === -1 || bestCount === 0) return false

  // Count idle drones (including this one) to determine chunk size
  const idleCount = sim.drones.filter(d => d.status === 'idle').length
  const queue = sim.fieldWorkQueues.get(bestFieldId)!
  const field = sim.fields[bestFieldId]

  // Chunk: ceil(remaining / idle_drones), minimum one row worth of cells
  const minChunk = Math.max(10, Math.round(field.traversableCount / Math.max(1, field.rows)))
  const chunkSize = Math.max(minChunk, Math.ceil(queue.length / Math.max(1, idleCount)))
  const claimed = queue.splice(0, Math.min(chunkSize, queue.length))

  if (claimed.length === 0) return false

  const route: DroneRoute = {
    fieldId: bestFieldId,
    waypoints: claimed,
    waypointIndex: 0,
  }
  drone.route = route
  return true
}

export function cellToPosition(field: Field, col: number, row: number): Coordinate {
  return cellToCoordinate(field, col, row)
}
