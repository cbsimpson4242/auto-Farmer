import { Drone } from '../types/simulation'
import { COLORS, DRONE_SIZE } from '../simulation/constants'

function statusColor(status: Drone['status']): string {
  switch (status) {
    case 'working': return COLORS.droneWorking
    case 'returning': return COLORS.droneReturning
    case 'charging': return COLORS.droneCharging
    case 'flying_to_field': return COLORS.droneBody
    default: return COLORS.droneIdle
  }
}

function batteryColor(level: number): string {
  if (level > 0.5) return COLORS.batteryGreen
  if (level > 0.2) return COLORS.batteryYellow
  return COLORS.batteryRed
}

export function renderDrone(ctx: CanvasRenderingContext2D, drone: Drone): void {
  const { px, status, batteryLevel, trail } = drone

  // Trail
  if (trail.length > 1) {
    for (let i = 0; i < trail.length - 1; i++) {
      const alpha = (i + 1) / trail.length * 0.4
      ctx.strokeStyle = `rgba(200, 255, 200, ${alpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(trail[i].x, trail[i].y)
      ctx.lineTo(trail[i + 1].x, trail[i + 1].y)
      ctx.stroke()
    }
    // Line from last trail point to current position
    const last = trail[trail.length - 1]
    ctx.strokeStyle = COLORS.trailColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(px.x, px.y)
    ctx.stroke()
  }

  // Drone body (small square)
  const half = DRONE_SIZE / 2
  ctx.fillStyle = statusColor(status)
  ctx.fillRect(px.x - half, px.y - half, DRONE_SIZE, DRONE_SIZE)

  // Outline
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.strokeRect(px.x - half, px.y - half, DRONE_SIZE, DRONE_SIZE)

  // Battery bar above drone
  const barWidth = 16
  const barHeight = 3
  const barX = px.x - barWidth / 2
  const barY = px.y - half - 6

  ctx.fillStyle = '#333'
  ctx.fillRect(barX, barY, barWidth, barHeight)
  ctx.fillStyle = batteryColor(batteryLevel)
  ctx.fillRect(barX, barY, barWidth * batteryLevel, barHeight)

  // Drone ID
  ctx.fillStyle = COLORS.hudText
  ctx.font = '8px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`${drone.id + 1}`, px.x, px.y + half + 9)
}
