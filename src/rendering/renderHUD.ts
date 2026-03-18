import { Field, SimState } from '../types/simulation'
import { COLORS } from '../simulation/constants'

function computeFieldCoverage(field: Field): number {
  if (field.traversableCount === 0) return 1
  let covered = 0
  for (const c of field.cells) {
    if (c === 'covered') covered++
  }
  return covered / field.traversableCount
}

export function renderHUD(ctx: CanvasRenderingContext2D, sim: SimState): void {
  ctx.font = '12px monospace'
  ctx.textAlign = 'left'

  for (const field of sim.fields) {
    const coverage = computeFieldCoverage(field)
    const pct = (coverage * 100).toFixed(0)

    // Field label above field
    ctx.fillStyle = COLORS.hudText
    ctx.font = 'bold 12px monospace'
    ctx.fillText(field.label, field.originPx.x, field.originPx.y - 6)

    // Coverage overlay in top-right of field
    const textX = field.originPx.x + field.cols * field.cellSize - 40
    ctx.font = '11px monospace'
    ctx.fillStyle = coverage >= 1 ? '#80ff80' : COLORS.hudText
    ctx.fillText(`${pct}%`, textX, field.originPx.y - 6)
  }
}
