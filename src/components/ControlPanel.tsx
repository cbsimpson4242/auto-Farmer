import React from 'react'

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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={onStart}
          disabled={isRunning && !isPaused}
          style={btnStyle}
        >
          {!isRunning ? 'Start' : 'Resume'}
        </button>
        <button
          onClick={onPause}
          disabled={!isRunning || isPaused}
          style={btnStyle}
        >
          Pause
        </button>
        <button onClick={onReset} style={btnStyle}>
          Reset
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Speed:</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 4, 8].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              style={{ ...btnStyle, fontSize: 11, padding: '3px 8px' }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Drones: {droneCount}</label>
        <input
          type="range"
          min={1}
          max={8}
          value={droneCount}
          onChange={e => onDroneCountChange(Number(e.target.value))}
          disabled={isRunning}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: '#3a5a3a',
  color: '#e0e0d0',
  border: '1px solid #5a8a5a',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 13,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#c0c0b0',
  fontFamily: 'monospace',
  fontSize: 12,
  marginBottom: 4,
}
