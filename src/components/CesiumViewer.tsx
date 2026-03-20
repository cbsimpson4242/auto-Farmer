import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { SimState, GeoPoint } from '../types/simulation'

interface Props {
  simState: SimState
  currentPoints: GeoPoint[]
  onAddPoint: (point: GeoPoint) => void
  onCompleteField: () => void
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

function toCartesian(point: GeoPoint, heightOffset = 0) {
  return Cesium.Cartesian3.fromDegrees(point.lon, point.lat, (point.height || 0) + heightOffset)
}

function getFieldCenter(boundary: GeoPoint[]) {
  const totals = boundary.reduce(
    (acc, point) => ({
      lon: acc.lon + point.lon,
      lat: acc.lat + point.lat,
      height: acc.height + point.height,
    }),
    { lon: 0, lat: 0, height: 0 },
  )

  return {
    lon: totals.lon / boundary.length,
    lat: totals.lat / boundary.length,
    height: totals.height / boundary.length,
  }
}

export function CesiumViewer({ simState, currentPoints, onAddPoint, onCompleteField }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const modeRef = useRef(simState.mode)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    modeRef.current = simState.mode
  }, [simState.mode])

  useEffect(() => {
    if (!containerRef.current) return

    // Check for WebGL support
    if (!window.WebGLRenderingContext) {
      setError('Your browser does not support WebGL.')
      return
    }

    let viewer: Cesium.Viewer | null = null

    try {
      // Initialize Cesium with minimal defaults to avoid Ion conflicts
      viewer = new Cesium.Viewer(containerRef.current, {
        terrainProvider: undefined,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
      })

      viewerRef.current = viewer

      // Disable Ion by default to prevent auth-related hangs
      Cesium.Ion.defaultAccessToken = ''

      const loadTiles = async () => {
        try {
          const tileset = await Cesium.createGooglePhotorealistic3DTileset(GOOGLE_API_KEY)
          if (viewer) {
            viewer.scene.primitives.add(tileset)
            viewer.scene.globe.show = false
            
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(-93.6091, 41.6005, 1500),
              orientation: {
                pitch: Cesium.Math.toRadians(-35),
              },
              duration: 2
            })
            setLoading(false)
          }
        } catch (err) {
          console.error('Google Tiles error:', err)
          if (viewer) {
            viewer.scene.globe.show = true
            setLoading(false)
          }
        }
      }

      loadTiles()
    } catch (err: any) {
      console.error('Cesium init error:', err)
      setError(`Failed to initialize 3D viewer: ${err.message || 'Unknown error'}`)
    }

    // Handle clicks for mapping
    const handler = viewer ? new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas) : null
    if (handler && viewer) {
        handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
          if (modeRef.current !== 'mapping') return

          const pickedCartesian = viewer!.scene.pickPositionSupported
            ? viewer!.scene.pickPosition(click.position)
            : undefined
          const cartesian = pickedCartesian ?? viewer!.camera.pickEllipsoid(click.position, viewer!.scene.globe.ellipsoid)

          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
            onAddPoint({
              lon: Cesium.Math.toDegrees(cartographic.longitude),
              lat: Cesium.Math.toDegrees(cartographic.latitude),
              height: Number.isFinite(cartographic.height) ? cartographic.height : 0,
            })
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }

    return () => {
      handler?.destroy()
      viewer?.destroy()
      viewerRef.current = null
    }
  }, [])

  // Sync drones and fields
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || loading) return

    viewer.entities.removeAll()

    viewer.entities.add({
      id: 'base-station',
      position: toCartesian(simState.base.position, 20),
      point: {
        pixelSize: 16,
        color: Cesium.Color.fromCssColorString('#fbbf24'),
        outlineColor: Cesium.Color.fromCssColorString('#0f172a'),
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: simState.base.label,
        font: '13px "JetBrains Mono", monospace',
        fillColor: Cesium.Color.fromCssColorString('#f8fafc'),
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: Cesium.Color.fromCssColorString('#020617'),
        outlineWidth: 2,
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.7),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    })

    if (currentPoints.length > 0) {
      const previewLoop = currentPoints.length > 2 ? [...currentPoints, currentPoints[0]] : currentPoints

      viewer.entities.add({
        id: 'mapping-preview-outline',
        polyline: {
          positions: previewLoop.map(point => toCartesian(point, 10)),
          width: 4,
          material: Cesium.Color.fromCssColorString('#f59e0b'),
          clampToGround: false,
        },
      })

      currentPoints.forEach((point, index) => {
        viewer.entities.add({
          id: `mapping-point-${index}`,
          position: toCartesian(point, 12),
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString('#f59e0b'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        })
      })

      if (currentPoints.length >= 3) {
        viewer.entities.add({
          id: 'mapping-preview-fill',
          polygon: {
            hierarchy: new Cesium.PolygonHierarchy(currentPoints.map(point => toCartesian(point, 8))),
            material: Cesium.Color.fromCssColorString('#f59e0b').withAlpha(0.22),
            perPositionHeight: true,
            outline: false,
          },
        })
      }
    }

    simState.fields.forEach(field => {
      const center = getFieldCenter(field.boundary)
      const fieldLoop = [...field.boundary, field.boundary[0]]

      viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            field.boundary.map(point => toCartesian(point, 6))
          ),
          material: Cesium.Color.fromCssColorString('#2563eb').withAlpha(0.24),
          perPositionHeight: true,
          outline: false,
        },
      })

      viewer.entities.add({
        polyline: {
          positions: fieldLoop.map(point => toCartesian(point, 10)),
          width: 4,
          material: Cesium.Color.fromCssColorString('#e2e8f0'),
          clampToGround: false,
        },
        position: toCartesian(center, 18),
        label: {
          text: field.label,
          font: '13px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.fromCssColorString('#f8fafc'),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#0f172a').withAlpha(0.65),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    })

    simState.drones.forEach(drone => {
      viewer.entities.add({
        position: toCartesian(drone.position, 28),
        point: {
          pixelSize: drone.status === 'working' ? 16 : 14,
          color: drone.status === 'working' ? Cesium.Color.fromCssColorString('#60a5fa') : Cesium.Color.fromCssColorString('#f8fafc'),
          outlineColor: Cesium.Color.fromCssColorString('#0f172a'),
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `D${drone.id + 1}`,
          font: '12px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.fromCssColorString('#f8fafc'),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.fromCssColorString('#020617'),
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })
    })
  }, [currentPoints, simState, loading])

  return (
    <div className="canvas-frame">
      <div className="canvas-header">
        <div>
          <p className="canvas-label">3D Mission View</p>
          <h2>Google Earth Simulation</h2>
        </div>
        <button
          className={`mapping-btn ${simState.mode === 'mapping' ? 'active' : ''}`}
          onClick={onCompleteField}
        >
          {simState.mode === 'mapping' ? 'Confirm Geo-fence' : 'Add New Field'}
        </button>
      </div>
      <div className="cesium-container-wrapper" style={{ position: 'relative', height: '600px', background: '#000' }}>
        {loading && !error && (
          <div className="cesium-loading-overlay">
            <div className="loader"></div>
            <p>Initializing 3D Environment...</p>
          </div>
        )}
        {error && (
          <div className="cesium-error-overlay">
            <p>⚠️ {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
