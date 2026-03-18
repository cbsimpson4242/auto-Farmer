import { Field, Vec2 } from '../types/simulation'

/**
 * Boustrophedon (lawnmower) sweep: snake pattern across all traversable cells.
 * Even rows go left→right, odd rows go right→left.
 * Obstacle cells are simply skipped.
 */
export function computeSweepPath(field: Field): Vec2[] {
  const waypoints: Vec2[] = []
  for (let r = 0; r < field.rows; r++) {
    const rowCells: Vec2[] = []
    for (let c = 0; c < field.cols; c++) {
      if (!field.obstacleSet.has(`${c},${r}`)) {
        rowCells.push({ x: c, y: r })
      }
    }
    // Reverse odd rows for snake pattern
    if (r % 2 === 1) rowCells.reverse()
    waypoints.push(...rowCells)
  }
  return waypoints
}
