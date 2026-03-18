import { Drone, SimState } from '../types/simulation'
import { BATTERY_LOW_THRESHOLD, CHARGE_RATE, FLY_SPEED, TRAIL_LENGTH } from './constants'
import { coordinateDistanceMeters, moveCoordinateToward } from './geo'
import { tryAssignWork, cellToPosition } from './workPartitioner'

function shouldRetaskDrone(sim: SimState, drone: Drone): boolean {
  return sim.mission.pendingFieldId != null && drone.route?.fieldId !== sim.mission.pendingFieldId
}

function pushTrail(drone: Drone) {
  drone.trail.push({ lng: drone.position.lng, lat: drone.position.lat })
  if (drone.trail.length > TRAIL_LENGTH) drone.trail.shift()
}

function moveToward(drone: Drone, deltaMs: number, speed: number): boolean {
  const remaining = coordinateDistanceMeters(drone.position, drone.targetPosition)
  if (remaining <= 0.5) {
    drone.position = { ...drone.targetPosition }
    return true
  }

  const step = speed * (deltaMs / 1000)
  const result = moveCoordinateToward(drone.position, drone.targetPosition, step)
  drone.position = result.position
  return result.arrived
}

export function tickDrone(drone: Drone, sim: SimState, deltaMs: number): void {
  switch (drone.status) {
    case 'idle': {
      if (tryAssignWork(sim, drone)) {
        const route = drone.route!
        const field = sim.fields[route.fieldId]
        const wp = route.waypoints[route.waypointIndex]
        drone.targetPosition = cellToPosition(field, wp.x, wp.y)
        drone.status = 'flying_to_field'
      }
      break
    }

    case 'flying_to_field': {
      pushTrail(drone)
      const arrived = moveToward(drone, deltaMs, FLY_SPEED)
      drone.batteryLevel -= 0.00002 * deltaMs
      if (drone.batteryLevel < 0) drone.batteryLevel = 0

      if (arrived) {
        drone.status = 'working'
      }

      if (drone.batteryLevel < 0.1) {
        drone.targetPosition = { ...sim.base.position }
        drone.status = 'returning'
      }
      break
    }

    case 'working': {
      if (!drone.route) {
        drone.status = 'idle'
        break
      }

      pushTrail(drone)
      const route = drone.route
      const field = sim.fields[route.fieldId]
      const wp = route.waypoints[route.waypointIndex]
      drone.targetPosition = cellToPosition(field, wp.x, wp.y)

      const arrived = moveToward(drone, deltaMs, drone.speed)

      if (arrived) {
        const cellIdx = wp.y * field.cols + wp.x
        if (field.cells[cellIdx] === 'empty') {
          field.cells[cellIdx] = 'covered'
          drone.cellsCovered++
          drone.fertilizerDispensed += field.fertilizerPerCellLiters
        }
        drone.batteryLevel -= drone.batteryDrainPerCell
        if (drone.batteryLevel < 0) drone.batteryLevel = 0

        route.waypointIndex++
        route.completedCount++

        if (shouldRetaskDrone(sim, drone)) {
          drone.targetPosition = { ...sim.base.position }
          drone.status = 'returning'
          break
        }

        if (route.waypointIndex >= route.waypoints.length) {
          drone.route = null
          drone.status = 'idle'
          break
        }

        if (drone.batteryLevel < BATTERY_LOW_THRESHOLD) {
          drone.targetPosition = { ...sim.base.position }
          drone.status = 'returning'
          break
        }

        const nextWp = route.waypoints[route.waypointIndex]
        drone.targetPosition = cellToPosition(field, nextWp.x, nextWp.y)
      }
      break
    }

    case 'returning': {
      pushTrail(drone)
      const arrived = moveToward(drone, deltaMs, FLY_SPEED)
      drone.batteryLevel -= 0.00002 * deltaMs
      if (drone.batteryLevel < 0) drone.batteryLevel = 0

      if (arrived) {
        drone.status = 'charging'
      }
      break
    }

    case 'charging': {
      drone.batteryLevel += CHARGE_RATE * deltaMs
      if (drone.batteryLevel >= 1.0) {
        drone.batteryLevel = 1.0
        if (drone.route && drone.route.waypointIndex < drone.route.waypoints.length) {
          const field = sim.fields[drone.route.fieldId]
          const wp = drone.route.waypoints[drone.route.waypointIndex]
          drone.targetPosition = cellToPosition(field, wp.x, wp.y)
          drone.status = 'flying_to_field'
        } else {
          drone.route = null
          drone.status = 'idle'
        }
      }
      break
    }
  }
}
