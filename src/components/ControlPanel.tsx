interface Props {
  isRunning: boolean
  isPaused: boolean
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
  onStart,
  onPause,
  onReset,
  onSpeedChange,
  onDroneCountChange,
  droneCount,
}: Props) {
  return (
    <section className="panel-card control-card">
      <div className="panel-heading">
        <p className="eyebrow">Mission Controls</p>
        <h2>Dispatch the fleet</h2>
      </div>

      <p className="panel-copy">
        Start a treatment pass, pause for inspection, or reset to compare how quickly each launch plan clears the parcels.
      </p>

      <div className="button-row">
        <button onClick={onStart} disabled={isRunning && !isPaused} className="ui-button">
          {!isRunning ? 'Start' : 'Resume'}
        </button>
        <button onClick={onPause} disabled={!isRunning || isPaused} className="ui-button ui-button-secondary">
          Pause
        </button>
        <button onClick={onReset} className="ui-button ui-button-secondary">
          Reset
        </button>
      </div>

      <div className="control-block">
        <label className="control-label">Simulation Speed</label>
        <div className="speed-grid">
          {[1, 2, 4, 8].map(speed => (
            <button key={speed} onClick={() => onSpeedChange(speed)} className="ui-button ui-button-small">
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="control-block">
        <label className="control-label">Drones Available: {droneCount}</label>
        <input
          type="range"
          min={1}
          max={8}
          value={droneCount}
          onChange={event => onDroneCountChange(Number(event.target.value))}
          disabled={isRunning}
          className="control-slider"
        />
      </div>
    </section>
  )
}
