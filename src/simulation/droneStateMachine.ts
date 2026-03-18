import { Drone, SimState, Vec2 } from '../types/simulation'
import { BATTERY_LOW_THRESHOLD, CHARGE_RATE, FERTILIZER_PER_CELL, FLY_SPEED, TRAIL_LENGTH } from './constants'
import { tryAssignWork, cellToPixel } from './workPartitioner'

function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function pushTrail(drone: Drone) {
  drone.trail.push({ x: drone.px.x, y: drone.px.y })
  if (drone.trail.length > TRAIL_LENGTH) drone.trail.shift()
}

function moveToward(drone: Drone, target: Vec2, speed: number, deltaMs: number): boolean {
  const d = dist(drone.px, target)
  if (d < 1) {
    drone.px.x = target.x
    drone.px.y = target.y
    return true // arrived
  }
  const step = speed * (deltaMs / 1000)
  if (step >= d) {
    drone.px.x = target.x
    drone.px.y = target.y
    return true
  }
  const ratio = step / d
  drone.px.x += (target.x - drone.px.x) * ratio
  drone.px.y += (target.y - drone.px.y) * ratio
  return false
}

export function tickDrone(drone: Drone, sim: SimState, deltaMs: number): void {
  switch (drone.status) {
    case 'idle': {
      if (tryAssignWork(sim, drone)) {
        // Set target to first waypoint
        const route = drone.route!
        const field = sim.fields[route.fieldId]
        const wp = route.waypoints[route.waypointIndex]
        drone.targetPx = cellToPixel(field, wp.x, wp.y)
        drone.status = 'flying_to_field'
      }
      break
    }

    case 'flying_to_field': {
      pushTrail(drone)
      const arrived = moveToward(drone, drone.targetPx, FLY_SPEED, deltaMs)
      drone.batteryLevel -= 0.00002 * deltaMs
      if (drone.batteryLevel < 0) drone.batteryLevel = 0

      if (arrived) {
        drone.status = 'working'
      }

      // Emergency: battery critically low while flying to field
      if (drone.batteryLevel < 0.10) {
        drone.targetPx = { ...sim.base.px }
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
      const target = cellToPixel(field, wp.x, wp.y)

      const arrived = moveToward(drone, target, drone.speed, deltaMs)

      if (arrived) {
        // Mark cell as covered
        const cellIdx = wp.y * field.cols + wp.x
        if (field.cells[cellIdx] === 'empty') {
          field.cells[cellIdx] = 'covered'
          drone.cellsCovered++
          drone.fertilizerDispensed += FERTILIZER_PER_CELL
        }
        drone.batteryLevel -= drone.batteryDrainPerCell
        if (drone.batteryLevel < 0) drone.batteryLevel = 0

        route.waypointIndex++

        // Check if route complete
        if (route.waypointIndex >= route.waypoints.length) {
          drone.route = null
          drone.status = 'idle'
          break
        }

        // Check battery
        if (drone.batteryLevel < BATTERY_LOW_THRESHOLD) {
          drone.targetPx = { ...sim.base.px }
          drone.status = 'returning'
          break
        }

        // Set next waypoint target
        const nextWp = route.waypoints[route.waypointIndex]
        drone.targetPx = cellToPixel(field, nextWp.x, nextWp.y)
      }
      break
    }

    case 'returning': {
      pushTrail(drone)
      const arrived = moveToward(drone, drone.targetPx, FLY_SPEED, deltaMs)
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
        // Check if there's remaining work on current route or new work
        if (drone.route && drone.route.waypointIndex < drone.route.waypoints.length) {
          const field = sim.fields[drone.route.fieldId]
          const wp = drone.route.waypoints[drone.route.waypointIndex]
          drone.targetPx = cellToPixel(field, wp.x, wp.y)
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
