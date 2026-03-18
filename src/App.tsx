import { useSimulation } from './hooks/useSimulation'
import { SimulationCanvas } from './components/SimulationCanvas'
import { ControlPanel } from './components/ControlPanel'
import { StatsPanel } from './components/StatsPanel'

export default function App() {
  const {
    canvasRef,
    snapshot,
    isRunning,
    isPaused,
    speedMultiplier,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
  } = useSimulation()

  return (
    <div className="app-shell">
      <div className="app-backdrop" />

      <main className="app-layout">
        <section className="app-main-panel">
          <div className="app-hero">
            <div>
              <p className="eyebrow">Autonomous field operations</p>
              <h1>Auto Farmer</h1>
              <p className="hero-copy">
                Coordinate smart drones, track fertilizer usage, and monitor field coverage in real time.
              </p>
            </div>

            <div className="hero-badges" aria-label="Simulation status">
              <span className={`status-pill ${isRunning ? 'is-live' : 'is-idle'}`}>
                {isRunning ? (isPaused ? 'Paused' : 'Live run') : 'Ready'}
              </span>
              <span className="status-pill">{snapshot.drones.length} drones</span>
              <span className="status-pill">{speedMultiplier}x speed</span>
            </div>
          </div>

          <SimulationCanvas canvasRef={canvasRef} />
        </section>

        <aside className="app-sidebar">
          <div className="sidebar-card brand-card">
            <p className="sidebar-label">Mission control</p>
            <p className="sidebar-copy">
              Tune launch settings, adjust pace, and keep the fleet productive from one panel.
            </p>
          </div>

          <div className="sidebar-card">
            <ControlPanel
              isRunning={isRunning}
              isPaused={isPaused}
              speedMultiplier={speedMultiplier}
              onStart={onStart}
              onPause={onPause}
              onReset={onReset}
              onSpeedChange={onSpeedChange}
              onDroneCountChange={onDroneCountChange}
              droneCount={snapshot.drones.length}
            />
          </div>

          <div className="sidebar-card">
            <StatsPanel snapshot={snapshot} />
          </div>
        </aside>
      </main>
    </div>
  )
}
