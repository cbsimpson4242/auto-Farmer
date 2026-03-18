import { useSimulation } from './hooks/useSimulation'
import { CesiumViewer } from './components/CesiumViewer'
import { ControlPanel } from './components/ControlPanel'
import { StatsPanel } from './components/StatsPanel'

export default function App() {
  const {
    sim,
    onAddPoint,
    onCompleteField,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
  } = useSimulation()

  const { running, paused, speedMultiplier, droneCount, statsSnapshot } = sim

  return (
    <div className="app-shell">
      <div className="app-backdrop" />

      <main className="app-layout">
        <section className="app-main-panel">
          <div className="app-hero">
            <div>
              <p className="eyebrow">3D Autonomous field operations</p>
              <h1>Auto Farmer 3D</h1>
              <p className="hero-copy">
                Define real-world geo-fences on Google Photorealistic 3D Tiles and coordinate your smart fleet.
              </p>
            </div>

            <div className="hero-badges" aria-label="Simulation status">
              <span className={`status-pill ${running ? 'is-live' : 'is-idle'}`}>
                {running ? (paused ? 'Paused' : 'Live run') : 'Ready'}
              </span>
              <span className="status-pill">{sim.fields.length} fields</span>
              <span className="status-pill">{droneCount} drones</span>
              <span className="status-pill">{speedMultiplier}x speed</span>
            </div>
          </div>

          <CesiumViewer
            simState={sim}
            onAddPoint={onAddPoint}
            onCompleteField={onCompleteField}
          />
        </section>

        <aside className="app-sidebar">
          <div className="sidebar-card brand-card">
            <p className="sidebar-label">Mission control</p>
            <p className="sidebar-copy">
              {sim.mode === 'mapping'
                ? 'Click on the map to define the corners of your field. Click "Confirm Geo-fence" when done.'
                : 'Start the simulation to deploy drones to your defined fields.'}
            </p>
          </div>

          <div className="sidebar-card">
            <ControlPanel
              isRunning={running}
              isPaused={paused}
              speedMultiplier={speedMultiplier}
              onStart={onStart}
              onPause={onPause}
              onReset={onReset}
              onSpeedChange={onSpeedChange}
              onDroneCountChange={onDroneCountChange}
              droneCount={droneCount}
            />
          </div>

          <div className="sidebar-card">
            <StatsPanel snapshot={statsSnapshot} />
          </div>
        </aside>
      </main>
    </div>
  )
}
