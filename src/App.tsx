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
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
  } = useSimulation()

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      padding: 16,
      minHeight: '100vh',
      background: '#111',
      color: '#e0e0d0',
      fontFamily: 'monospace',
    }}>
      <div style={{ flex: '1 1 auto' }}>
        <SimulationCanvas canvasRef={canvasRef} />
      </div>
      <div style={{
        width: 220,
        flexShrink: 0,
        padding: 12,
        background: '#1a1a1a',
        borderRadius: 6,
        border: '1px solid #333',
        alignSelf: 'flex-start',
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#8ab88a' }}>
          Auto Farmer
        </h2>
        <ControlPanel
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={onStart}
          onPause={onPause}
          onReset={onReset}
          onSpeedChange={onSpeedChange}
          onDroneCountChange={onDroneCountChange}
          droneCount={snapshot.drones.length}
        />
        <StatsPanel snapshot={snapshot} />
      </div>
    </div>
  )
}
