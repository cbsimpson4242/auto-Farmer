import { Field } from '../types/simulation'
import { COLORS } from '../simulation/constants'

export function renderField(ctx: CanvasRenderingContext2D, field: Field): void {
  const { originPx, cols, rows, cellSize, cells } = field

  // Field border
  ctx.strokeStyle = COLORS.fieldBorder
  ctx.lineWidth = 2
  ctx.strokeRect(originPx.x - 1, originPx.y - 1, cols * cellSize + 2, rows * cellSize + 2)

  // Draw cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const state = cells[idx]
      const x = originPx.x + c * cellSize
      const y = originPx.y + r * cellSize

      switch (state) {
        case 'empty':
          ctx.fillStyle = COLORS.cellEmpty
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1)
          break
        case 'covered':
          ctx.fillStyle = COLORS.cellCovered
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1)
          // Small dot to indicate fertilized
          ctx.fillStyle = COLORS.cellCoveredDot
          ctx.fillRect(x + cellSize / 2 - 1, y + cellSize / 2 - 1, 3, 3)
          break
        case 'obstacle':
          ctx.fillStyle = COLORS.cellObstacle
          ctx.fillRect(x, y, cellSize - 1, cellSize - 1)
          ctx.strokeStyle = COLORS.cellObstacleStroke
          ctx.lineWidth = 1
          ctx.strokeRect(x + 1, y + 1, cellSize - 3, cellSize - 3)
          break
      }
    }
  }
}
