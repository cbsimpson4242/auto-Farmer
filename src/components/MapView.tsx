import { useEffect, useMemo, useRef } from 'react'
import maplibregl, { GeoJSONSource, LngLatBoundsLike, Map } from 'maplibre-gl'
import { closeRing, cellPolygon, centroid } from '../simulation/geo'
import { COLORS } from '../simulation/constants'
import { Coordinate, Field, SimState } from '../types/simulation'

interface Props {
  sim: SimState
  selectedFieldId: number
  onSelectField: (fieldId: number) => void
}

function buildBounds(fields: Field[]): LngLatBoundsLike {
  const west = Math.min(...fields.map(field => field.bounds.west))
  const south = Math.min(...fields.map(field => field.bounds.south))
  const east = Math.max(...fields.map(field => field.bounds.east))
  const north = Math.max(...fields.map(field => field.bounds.north))
  return [[west, south], [east, north]]
}

function polygonFeature(coordinates: Coordinate[], properties: Record<string, unknown>) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [closeRing(coordinates).map(point => [point.lng, point.lat])],
    },
    properties,
  }
}

export function MapView({ sim, selectedFieldId, onSelectField }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)

  const parcelData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: sim.fields.map(field =>
        polygonFeature(field.polygon, {
          id: field.id,
          label: field.label,
          crop: field.crop,
          selected: field.id === selectedFieldId,
        }),
      ),
    }),
    [selectedFieldId, sim.fields],
  )

  const exclusionData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: sim.fields.flatMap(field =>
        field.exclusions.map(exclusion => polygonFeature(exclusion.polygon, { fieldId: field.id, label: exclusion.label })),
      ),
    }),
    [sim.fields],
  )

  const coverageData = useMemo(() => {
    const features = [] as ReturnType<typeof polygonFeature>[]
    for (const field of sim.fields) {
      for (let row = 0; row < field.rows; row++) {
        for (let col = 0; col < field.cols; col++) {
          const index = row * field.cols + col
          if (field.cells[index] !== 'covered') continue
          features.push(polygonFeature(cellPolygon(field, col, row), { fieldId: field.id }))
        }
      }
    }
    return { type: 'FeatureCollection' as const, features }
  }, [sim.fields])

  const targetData = useMemo(() => {
    const field = sim.fields.find(item => item.id === selectedFieldId)
    if (!field) return { type: 'FeatureCollection' as const, features: [] as ReturnType<typeof polygonFeature>[] }

    const features = [] as ReturnType<typeof polygonFeature>[]
    for (let row = 0; row < field.rows; row++) {
      for (let col = 0; col < field.cols; col++) {
        const index = row * field.cols + col
        if (field.cells[index] !== 'empty') continue
        features.push(polygonFeature(cellPolygon(field, col, row), { fieldId: field.id }))
      }
    }
    return { type: 'FeatureCollection' as const, features }
  }, [selectedFieldId, sim.fields])

  const droneData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: sim.drones.map(drone => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [drone.position.lng, drone.position.lat],
        },
        properties: {
          id: drone.id,
          status: drone.status,
        },
      })),
    }),
    [sim.drones],
  )

  const trailData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: sim.drones
        .filter(drone => drone.trail.length > 1)
        .map(drone => ({
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: drone.trail.map(point => [point.lng, point.lat]),
          },
          properties: {
            id: drone.id,
            status: drone.status,
          },
        })),
    }),
    [sim.drones],
  )

  const baseData = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [sim.base.position.lng, sim.base.position.lat],
          },
          properties: {
            label: sim.base.label,
          },
        },
      ],
    }),
    [sim.base.label, sim.base.position.lat, sim.base.position.lng],
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initialCenter = centroid(sim.fields[0].polygon)
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 15.4,
      pitch: 50,
      bearing: -15,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics, USDA FSA, GeoEye, CNES/Airbus DS, USGS, AeroGRID, IGN, and the GIS User Community',
          },
        },
        layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
      },
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    map.on('load', () => {
      map.addSource('parcels', { type: 'geojson', data: parcelData })
      map.addSource('exclusions', { type: 'geojson', data: exclusionData })
      map.addSource('targets', { type: 'geojson', data: targetData })
      map.addSource('coverage', { type: 'geojson', data: coverageData })
      map.addSource('drones', { type: 'geojson', data: droneData })
      map.addSource('trails', { type: 'geojson', data: trailData })
      map.addSource('base', { type: 'geojson', data: baseData })

      map.addLayer({
        id: 'parcel-fill',
        type: 'fill',
        source: 'parcels',
        paint: {
          'fill-color': ['case', ['boolean', ['get', 'selected'], false], COLORS.selectedParcel, '#ffffff'],
          'fill-opacity': ['case', ['boolean', ['get', 'selected'], false], 0.18, 0.07],
        },
      })
      map.addLayer({
        id: 'target-fill',
        type: 'fill',
        source: 'targets',
        paint: {
          'fill-color': COLORS.targetFill,
          'fill-outline-color': COLORS.targetStroke,
        },
      })
      map.addLayer({
        id: 'coverage-fill',
        type: 'fill',
        source: 'coverage',
        paint: {
          'fill-color': COLORS.coverageFill,
          'fill-outline-color': COLORS.coverageStroke,
        },
      })
      map.addLayer({
        id: 'exclusion-fill',
        type: 'fill',
        source: 'exclusions',
        paint: {
          'fill-color': COLORS.exclusionFill,
        },
      })
      map.addLayer({
        id: 'parcel-outline',
        type: 'line',
        source: 'parcels',
        paint: {
          'line-color': COLORS.parcelOutline,
          'line-width': ['case', ['boolean', ['get', 'selected'], false], 3, 1.5],
        },
      })
      map.addLayer({
        id: 'trail-line',
        type: 'line',
        source: 'trails',
        paint: {
          'line-color': '#8be7f9',
          'line-width': 2,
          'line-opacity': 0.65,
        },
      })
      map.addLayer({
        id: 'base-point',
        type: 'circle',
        source: 'base',
        paint: {
          'circle-radius': 8,
          'circle-color': '#f4efe5',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0c1720',
        },
      })
      map.addLayer({
        id: 'drone-points',
        type: 'circle',
        source: 'drones',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'status'],
            'working', COLORS.droneWorking,
            'returning', COLORS.droneReturning,
            'charging', COLORS.droneCharging,
            COLORS.droneIdle,
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#11212e',
        },
      })

      map.on('click', 'parcel-fill', event => {
        const feature = event.features?.[0]
        const rawId = feature?.properties?.id
        const fieldId = typeof rawId === 'string' ? Number(rawId) : rawId
        if (typeof fieldId === 'number' && !Number.isNaN(fieldId)) {
          onSelectField(fieldId)
        }
      })
      map.on('mouseenter', 'parcel-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'parcel-fill', () => {
        map.getCanvas().style.cursor = ''
      })

      map.fitBounds(buildBounds(sim.fields), { padding: 60, duration: 0 })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [baseData, coverageData, droneData, exclusionData, onSelectField, parcelData, sim.fields, targetData])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    ;(map.getSource('parcels') as GeoJSONSource | undefined)?.setData(parcelData)
    ;(map.getSource('exclusions') as GeoJSONSource | undefined)?.setData(exclusionData)
    ;(map.getSource('targets') as GeoJSONSource | undefined)?.setData(targetData)
    ;(map.getSource('coverage') as GeoJSONSource | undefined)?.setData(coverageData)
    ;(map.getSource('drones') as GeoJSONSource | undefined)?.setData(droneData)
    ;(map.getSource('trails') as GeoJSONSource | undefined)?.setData(trailData)
    ;(map.getSource('base') as GeoJSONSource | undefined)?.setData(baseData)
  }, [baseData, coverageData, droneData, exclusionData, parcelData, targetData, trailData])

  return <div ref={containerRef} className="map-view" />
}
