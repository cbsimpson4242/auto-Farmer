import { BaseStation } from '../types/simulation'
import { COLORS, BASE_WIDTH, BASE_HEIGHT } from '../simulation/constants'

export function renderBase(ctx: CanvasRenderingContext2D, base: BaseStation, droneCount: number): void {
  const { px } = base
  const x = px.x - BASE_WIDTH / 2
  const y = px.y - BASE_HEIGHT / 2

  // Base platform
  ctx.fillStyle = COLORS.basePad
  ctx.fillRect(x, y, BASE_WIDTH, BASE_HEIGHT)

  // Border
  ctx.strokeStyle = COLORS.baseStation
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, BASE_WIDTH, BASE_HEIGHT)

  // Charging pad indicators
  const padSize = 8
  const padGap = 4
  const totalPadsWidth = droneCount * padSize + (droneCount - 1) * padGap
  const startX = px.x - totalPadsWidth / 2
  for (let i = 0; i < droneCount; i++) {
    ctx.fillStyle = '#667788'
    ctx.fillRect(startX + i * (padSize + padGap), px.y - padSize / 2, padSize, padSize)
  }

  // Label
  ctx.fillStyle = COLORS.hudText
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(base.label, px.x, y + BASE_HEIGHT + 14)
}
