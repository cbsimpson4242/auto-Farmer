import { sampleParcels } from '../data/sampleParcels'
import { BaseStation, CellState, Coordinate, Field } from '../types/simulation'
import { GRID_CELL_SIZE_METERS } from './constants'
import { centroid, getBounds, pointInPolygon, polygonAreaHa, projectCoordinate, unprojectCoordinate } from './geo'

function makeObstacleSet(obstacles: string[]): Set<string> {
  return new Set(obstacles)
}

export function createFields(): Field[] {
  return sampleParcels.map(parcel => {
    const projectionCenter = centroid(parcel.polygon)
    const bounds = getBounds(parcel.polygon)
    const projectedBounds = [
      projectCoordinate({ lng: bounds.west, lat: bounds.south }, projectionCenter),
      projectCoordinate({ lng: bounds.east, lat: bounds.north }, projectionCenter),
    ]
    const minX = Math.min(projectedBounds[0].x, projectedBounds[1].x)
    const maxX = Math.max(projectedBounds[0].x, projectedBounds[1].x)
    const minY = Math.min(projectedBounds[0].y, projectedBounds[1].y)
    const maxY = Math.max(projectedBounds[0].y, projectedBounds[1].y)
    const cols = Math.max(1, Math.ceil((maxX - minX) / GRID_CELL_SIZE_METERS))
    const rows = Math.max(1, Math.ceil((maxY - minY) / GRID_CELL_SIZE_METERS))

    const cells: CellState[] = []
    const obstacleKeys: string[] = []
    let traversableCount = 0

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const point = unprojectCoordinate(
          {
            x: minX + (col + 0.5) * GRID_CELL_SIZE_METERS,
            y: minY + (row + 0.5) * GRID_CELL_SIZE_METERS,
          },
          projectionCenter,
        )

        const inParcel = pointInPolygon(point, parcel.polygon)
        const inExclusion = parcel.exclusions.some(exclusion => pointInPolygon(point, exclusion.polygon))
        const key = `${col},${row}`

        if (inParcel && !inExclusion) {
          cells.push('empty')
          traversableCount++
        } else {
          cells.push('obstacle')
          obstacleKeys.push(key)
        }
      }
    }

    const cellAreaHa = (GRID_CELL_SIZE_METERS * GRID_CELL_SIZE_METERS) / 10000
    const totalAreaHa = polygonAreaHa(parcel.polygon)

    return {
      id: parcel.id,
      label: parcel.label,
      crop: parcel.crop,
      applicationRateLHa: parcel.applicationRateLHa,
      polygon: parcel.polygon,
      exclusions: parcel.exclusions,
      bounds,
      projectionCenter,
      gridOriginMeters: { x: minX, y: minY },
      cols,
      rows,
      cellSizeMeters: GRID_CELL_SIZE_METERS,
      cellAreaHa,
      totalAreaHa,
      fertilizerPerCellLiters: parcel.applicationRateLHa * cellAreaHa,
      cells,
      obstacleSet: makeObstacleSet(obstacleKeys),
      traversableCount,
    }
  })
}

export function createBase(fields: Field[]): BaseStation {
  const centers = fields.map(field => centroid(field.polygon))
  const mean = centers.reduce(
    (acc, center) => ({ lng: acc.lng + center.lng, lat: acc.lat + center.lat }),
    { lng: 0, lat: 0 },
  )
  const anchor: Coordinate = {
    lng: mean.lng / centers.length,
    lat: mean.lat / centers.length,
  }
  const southern = Math.min(...fields.map(field => field.bounds.south))

  return {
    position: {
      lng: anchor.lng,
      lat: southern - 260 / 111320,
    },
    label: 'Tender Pad',
  }
}
