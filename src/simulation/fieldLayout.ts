import { Field, BaseStation, Vec2 } from '../types/simulation'
import { CELL_SIZE, CANVAS_PADDING } from './constants'

function makeObstacleSet(obstacles: Vec2[]): Set<string> {
  const s = new Set<string>()
  for (const o of obstacles) s.add(`${o.x},${o.y}`)
  return s
}

function buildCells(cols: number, rows: number, obstacleSet: Set<string>): { cells: import('../types/simulation').CellState[]; traversableCount: number } {
  const cells: import('../types/simulation').CellState[] = []
  let traversableCount = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (obstacleSet.has(`${c},${r}`)) {
        cells.push('obstacle')
      } else {
        cells.push('empty')
        traversableCount++
      }
    }
  }
  return { cells, traversableCount }
}

// Tree cluster obstacles for Field A
function fieldAObstacles(): Vec2[] {
  const obs: Vec2[] = []
  // Tree cluster top-left area
  for (let r = 3; r <= 6; r++)
    for (let c = 4; c <= 7; c++) obs.push({ x: c, y: r })
  // Tree cluster middle-right
  for (let r = 10; r <= 12; r++)
    for (let c = 20; c <= 23; c++) obs.push({ x: c, y: r })
  // Scattered trees
  obs.push({ x: 14, y: 5 }, { x: 15, y: 5 }, { x: 14, y: 6 })
  obs.push({ x: 25, y: 2 }, { x: 26, y: 2 })
  obs.push({ x: 10, y: 16 }, { x: 11, y: 16 }, { x: 10, y: 17 })
  return obs
}

// Building obstacles along center for Field B
function fieldBObstacles(): Vec2[] {
  const obs: Vec2[] = []
  // Central building strip
  for (let r = 10; r <= 14; r++)
    for (let c = 8; c <= 16; c++) obs.push({ x: c, y: r })
  // Small shed
  for (let r = 3; r <= 4; r++)
    for (let c = 18; c <= 20; c++) obs.push({ x: c, y: r })
  // Fence line
  for (let c = 2; c <= 6; c++) obs.push({ x: c, y: 20 })
  return obs
}

// Scattered tree obstacles for Field C
function fieldCObstacles(): Vec2[] {
  const obs: Vec2[] = []
  // Scattered individual trees
  const singles: Vec2[] = [
    { x: 5, y: 3 }, { x: 12, y: 7 }, { x: 18, y: 2 }, { x: 25, y: 10 },
    { x: 30, y: 5 }, { x: 35, y: 8 }, { x: 8, y: 11 }, { x: 15, y: 4 },
    { x: 22, y: 12 }, { x: 28, y: 3 }, { x: 33, y: 11 }, { x: 37, y: 6 },
    { x: 3, y: 9 }, { x: 10, y: 1 }, { x: 20, y: 8 },
  ]
  obs.push(...singles)
  // Small tree cluster
  for (let r = 6; r <= 7; r++)
    for (let c = 14; c <= 15; c++) obs.push({ x: c, y: r })
  return obs
}

export function createFields(): Field[] {
  const pad = CANVAS_PADDING
  const gap = 30

  // Field A: top-left, 30×20
  const aObs = fieldAObstacles()
  const aSet = makeObstacleSet(aObs)
  const aCells = buildCells(30, 20, aSet)
  const fieldA: Field = {
    id: 0, label: 'Field A',
    originPx: { x: pad, y: pad },
    cols: 30, rows: 20, cellSize: CELL_SIZE,
    cells: aCells.cells, obstacleSet: aSet,
    traversableCount: aCells.traversableCount,
  }

  // Field B: top-right, 25×25
  const bObs = fieldBObstacles()
  const bSet = makeObstacleSet(bObs)
  const bCells = buildCells(25, 25, bSet)
  const fieldB: Field = {
    id: 1, label: 'Field B',
    originPx: { x: pad + 30 * CELL_SIZE + gap, y: pad },
    cols: 25, rows: 25, cellSize: CELL_SIZE,
    cells: bCells.cells, obstacleSet: bSet,
    traversableCount: bCells.traversableCount,
  }

  // Field C: bottom-center, 40×15
  const cObs = fieldCObstacles()
  const cSet = makeObstacleSet(cObs)
  const cCells = buildCells(40, 15, cSet)
  const fieldCOriginX = pad + Math.floor((30 * CELL_SIZE + gap + 25 * CELL_SIZE - 40 * CELL_SIZE) / 2)
  const fieldC: Field = {
    id: 2, label: 'Field C',
    originPx: { x: Math.max(pad, fieldCOriginX), y: pad + 25 * CELL_SIZE + gap },
    cols: 40, rows: 15, cellSize: CELL_SIZE,
    cells: cCells.cells, obstacleSet: cSet,
    traversableCount: cCells.traversableCount,
  }

  return [fieldA, fieldB, fieldC]
}

export function createBase(fields: Field[]): BaseStation {
  // Center below all fields
  const rightEdge = Math.max(...fields.map(f => f.originPx.x + f.cols * f.cellSize))
  const leftEdge = Math.min(...fields.map(f => f.originPx.x))
  const bottomEdge = Math.max(...fields.map(f => f.originPx.y + f.rows * f.cellSize))
  return {
    px: { x: (leftEdge + rightEdge) / 2, y: bottomEdge + 50 },
    label: 'Base Station',
  }
}

export function getCanvasSize(fields: Field[], base: BaseStation): { width: number; height: number } {
  const rightEdge = Math.max(...fields.map(f => f.originPx.x + f.cols * f.cellSize))
  const width = rightEdge + CANVAS_PADDING
  const height = base.px.y + 40 + CANVAS_PADDING
  return { width, height }
}
