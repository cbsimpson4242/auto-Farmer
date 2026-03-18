import { Coordinate, Field, GeoBounds, Vec2 } from '../types/simulation'

const METERS_PER_DEG_LAT = 111320

export function metersPerDegLng(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180)
}

export function projectCoordinate(point: Coordinate, center: Coordinate): Vec2 {
  return {
    x: (point.lng - center.lng) * metersPerDegLng(center.lat),
    y: (point.lat - center.lat) * METERS_PER_DEG_LAT,
  }
}

export function unprojectCoordinate(point: Vec2, center: Coordinate): Coordinate {
  return {
    lng: center.lng + point.x / metersPerDegLng(center.lat),
    lat: center.lat + point.y / METERS_PER_DEG_LAT,
  }
}

export function getBounds(points: Coordinate[]): GeoBounds {
  let west = Number.POSITIVE_INFINITY
  let east = Number.NEGATIVE_INFINITY
  let south = Number.POSITIVE_INFINITY
  let north = Number.NEGATIVE_INFINITY

  for (const point of points) {
    west = Math.min(west, point.lng)
    east = Math.max(east, point.lng)
    south = Math.min(south, point.lat)
    north = Math.max(north, point.lat)
  }

  return { west, south, east, north }
}

export function centroid(points: Coordinate[]): Coordinate {
  const total = points.reduce(
    (acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }),
    { lng: 0, lat: 0 },
  )

  return {
    lng: total.lng / points.length,
    lat: total.lat / points.length,
  }
}

export function pointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi

    if (intersects) inside = !inside
  }

  return inside
}

export function polygonAreaHa(polygon: Coordinate[]): number {
  const center = centroid(polygon)
  const projected = polygon.map(point => projectCoordinate(point, center))
  let area = 0

  for (let i = 0; i < projected.length; i++) {
    const current = projected[i]
    const next = projected[(i + 1) % projected.length]
    area += current.x * next.y - next.x * current.y
  }

  return Math.abs(area / 2) / 10000
}

export function coordinateDistanceMeters(a: Coordinate, b: Coordinate): number {
  const center = {
    lng: (a.lng + b.lng) / 2,
    lat: (a.lat + b.lat) / 2,
  }
  const pa = projectCoordinate(a, center)
  const pb = projectCoordinate(b, center)
  return Math.hypot(pb.x - pa.x, pb.y - pa.y)
}

export function moveCoordinateToward(
  current: Coordinate,
  target: Coordinate,
  maxStepMeters: number,
): { position: Coordinate; arrived: boolean } {
  const center = {
    lng: (current.lng + target.lng) / 2,
    lat: (current.lat + target.lat) / 2,
  }
  const currentProjected = projectCoordinate(current, center)
  const targetProjected = projectCoordinate(target, center)
  const dx = targetProjected.x - currentProjected.x
  const dy = targetProjected.y - currentProjected.y
  const distance = Math.hypot(dx, dy)

  if (distance <= 0.5 || maxStepMeters >= distance) {
    return { position: target, arrived: true }
  }

  const ratio = maxStepMeters / distance
  return {
    position: unprojectCoordinate(
      {
        x: currentProjected.x + dx * ratio,
        y: currentProjected.y + dy * ratio,
      },
      center,
    ),
    arrived: false,
  }
}

export function closeRing(points: Coordinate[]): Coordinate[] {
  if (points.length === 0) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (first.lng === last.lng && first.lat === last.lat) return points
  return [...points, first]
}

export function cellToCoordinate(field: Field, col: number, row: number): Coordinate {
  const centerPoint = {
    x: field.gridOriginMeters.x + (col + 0.5) * field.cellSizeMeters,
    y: field.gridOriginMeters.y + (row + 0.5) * field.cellSizeMeters,
  }
  return unprojectCoordinate(centerPoint, field.projectionCenter)
}

export function cellPolygon(field: Field, col: number, row: number): Coordinate[] {
  const x = field.gridOriginMeters.x + col * field.cellSizeMeters
  const y = field.gridOriginMeters.y + row * field.cellSizeMeters

  return closeRing([
    unprojectCoordinate({ x, y }, field.projectionCenter),
    unprojectCoordinate({ x: x + field.cellSizeMeters, y }, field.projectionCenter),
    unprojectCoordinate({ x: x + field.cellSizeMeters, y: y + field.cellSizeMeters }, field.projectionCenter),
    unprojectCoordinate({ x, y: y + field.cellSizeMeters }, field.projectionCenter),
  ])
}
