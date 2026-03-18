import { StatsSnapshot, DroneStatus } from '../types/simulation'

interface Props {
  snapshot: StatsSnapshot
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const s = secs % 60
  return `${mins}:${s.toString().padStart(2, '0')}`
}

function statusLabel(status: DroneStatus): string {
  switch (status) {
    case 'idle': return 'Idle'
    case 'flying_to_field': return 'Flying'
    case 'working': return 'Working'
    case 'returning': return 'Return'
    case 'charging': return 'Charge'
  }
}

function statusColor(status: DroneStatus): string {
  switch (status) {
    case 'working': return '#7ccf7c'
    case 'returning': return '#d36d59'
    case 'charging': return '#6ebddb'
    case 'flying_to_field': return '#ebe4c8'
    default: return '#c0c7bc'
  }
}

export function StatsPanel({ snapshot }: Props) {
  const totalCoverage = Math.round(snapshot.totalCoverage * 100)

  return (
    <div className="stats-panel">
      <div className="panel-heading">
        <h2>Telemetry</h2>
        <span>{totalCoverage}% complete</span>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span>Elapsed</span>
          <strong>{formatTime(snapshot.elapsedMs)}</strong>
        </div>
        <div className="metric-card">
          <span>Fertilizer</span>
          <strong>{snapshot.totalFertilizer.toFixed(1)}L</strong>
        </div>
        <div className="metric-card accent">
          <span>Total coverage</span>
          <strong>{totalCoverage}%</strong>
        </div>
      </div>

      <div className="stats-section">
        <div className="section-title-row">
          <h3>Field coverage</h3>
          <span>{snapshot.fieldCoverage.length} zones</span>
        </div>

        <div className="coverage-list">
          {snapshot.fieldCoverage.map(fc => {
            const coverage = Math.round(fc.coverage * 100)
            return (
              <div key={fc.id} className="coverage-row">
                <div className="coverage-labels">
                  <span>{fc.label}</span>
                  <strong>{coverage}%</strong>
                </div>
                <div className="coverage-track">
                  <div className="coverage-fill" style={{ width: `${coverage}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="stats-section">
        <div className="section-title-row">
          <h3>Drone health</h3>
          <span>{snapshot.drones.length} active units</span>
        </div>

        <div className="drone-list">
          {snapshot.drones.map(d => (
            <div key={d.id} className="drone-card">
              <div>
                <div className="drone-name">Drone {d.id + 1}</div>
                <div className="drone-meta">{d.cellsCovered} cells covered</div>
              </div>
              <div className="drone-status-block">
                <BatteryBar level={d.batteryLevel} />
                <span className="status-tag" style={{ color: statusColor(d.status) }}>
                  {statusLabel(d.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BatteryBar({ level }: { level: number }) {
  const color = level > 0.5 ? '#7ccf7c' : level > 0.2 ? '#dcbf63' : '#d36d59'

  return (
    <div className="battery-wrap">
      <div className="battery-track">
        <div className="battery-fill" style={{ width: `${level * 100}%`, background: color }} />
      </div>
      <span>{Math.round(level * 100)}%</span>
    </div>
  )
}
