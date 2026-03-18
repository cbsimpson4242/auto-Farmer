import { useEffect, useRef, useState, useCallback } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { SimState, GeoPoint } from '../types/simulation'

interface Props {
  simState: SimState
  onAddPoint: (point: GeoPoint) => void
  onCompleteField: () => void
}

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export function CesiumViewer({ simState, onAddPoint, onCompleteField }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      handler.setInputAction((click: any) => {
        if (simState.mode !== 'mapping') return
        const cartesian = viewer!.camera.pickEllipsoid(click.position, viewer!.scene.globe.ellipsoid)
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
          onAddPoint({
            lon: Cesium.Math.toDegrees(cartographic.longitude),
            lat: Cesium.Math.toDegrees(cartographic.latitude),
            height: cartographic.height,
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

    simState.fields.forEach(field => {
      viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(
            field.boundary.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height))
          ),
          material: Cesium.Color.BLUE.withAlpha(0.3),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          height: 1,
        },
        label: {
          text: field.label,
          font: '14px sans-serif',
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          pixelOffset: new Cesium.Cartesian2(0, -10),
        },
      })
    })

    simState.drones.forEach(drone => {
      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(drone.position.lon, drone.position.lat, drone.position.height + 15),
        point: {
          pixelSize: 12,
          color: drone.status === 'working' ? Cesium.Color.fromCssColorString('#60a5fa') : Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
        },
      })
    })
  }, [simState, loading])

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
