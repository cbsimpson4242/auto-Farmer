interface Props {
  isRunning: boolean
  isPaused: boolean
  speedMultiplier: number
  onStart: () => void
  onPause: () => void
  onReset: () => void
  onSpeedChange: (multiplier: number) => void
  onDroneCountChange: (count: number) => void
  droneCount: number
}

export function ControlPanel({
  isRunning,
  isPaused,
  speedMultiplier,
  onStart,
  onPause,
  onReset,
  onSpeedChange,
  onDroneCountChange,
  droneCount,
}: Props) {
  return (
    <div className="control-panel">
      <div className="panel-heading">
        <h2>Controls</h2>
        <span>{isRunning ? (isPaused ? 'Paused' : 'Running') : 'Standby'}</span>
      </div>

      <div className="button-row">
        <button
          onClick={onStart}
          disabled={isRunning && !isPaused}
          className="action-button primary"
        >
          {!isRunning ? 'Start' : 'Resume'}
        </button>
        <button
          onClick={onPause}
          disabled={!isRunning || isPaused}
          className="action-button"
        >
          Pause
        </button>
        <button onClick={onReset} className="action-button ghost">
          Reset
        </button>
      </div>

      <div className="control-section">
        <label className="control-label">Simulation speed</label>
        <div className="speed-grid">
          {[1, 2, 4, 8].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`speed-button ${speedMultiplier === s ? 'active' : ''}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="control-section">
        <div className="slider-header">
          <label className="control-label" htmlFor="drone-count">Fleet size</label>
          <span>{droneCount} drones</span>
        </div>
        <input
          id="drone-count"
          type="range"
          min={1}
          max={8}
          value={droneCount}
          onChange={e => onDroneCountChange(Number(e.target.value))}
          disabled={isRunning}
          className="drone-slider"
        />
        <p className="field-note">
          {isRunning ? 'Reset to change drone count.' : 'More drones improve coverage but increase coordination complexity.'}
        </p>
      </div>
    </div>
  )
}
