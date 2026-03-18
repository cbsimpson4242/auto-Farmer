import { StatsSnapshot, DroneStatus } from '../types/simulation'

interface Props {
  snapshot: StatsSnapshot
  selectedField: StatsSnapshot['fieldCoverage'][number]
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function statusLabel(status: DroneStatus): string {
  switch (status) {
    case 'idle':
      return 'Idle'
    case 'flying_to_field':
      return 'Flying'
    case 'working':
      return 'Working'
    case 'returning':
      return 'Return'
    case 'charging':
      return 'Charge'
  }
}

function statusColor(status: DroneStatus): string {
  switch (status) {
    case 'working':
      return '#68f1c5'
    case 'returning':
      return '#ff8b6b'
    case 'charging':
      return '#77b4ff'
    case 'flying_to_field':
      return '#e3e9ff'
    default:
      return '#cfd8e8'
  }
}

export function StatsPanel({ snapshot, selectedField }: Props) {
  const assignedDrones = snapshot.drones.filter(drone => drone.assignedFieldId === selectedField.id)

  return (
    <section className="panel-card stats-card">
      <div className="panel-heading">
        <p className="eyebrow">Parcel Insight</p>
        <h2>{selectedField.label}</h2>
      </div>

      <div className="stats-grid">
        <div className="metric-tile">
          <span>Elapsed</span>
          <strong>{formatTime(snapshot.elapsedMs)}</strong>
        </div>
        <div className="metric-tile">
          <span>Total Coverage</span>
          <strong>{(snapshot.totalCoverage * 100).toFixed(0)}%</strong>
        </div>
        <div className="metric-tile">
          <span>Applied</span>
          <strong>{snapshot.totalFertilizer.toFixed(0)} L</strong>
        </div>
        <div className="metric-tile">
          <span>Crop</span>
          <strong>{selectedField.crop}</strong>
        </div>
        <div className="metric-tile">
          <span>Mission Target</span>
          <strong>{snapshot.mission.targetFieldLabel ?? 'None'}</strong>
        </div>
        <div className="metric-tile">
          <span>Queued Drones</span>
          <strong>{assignedDrones.length}</strong>
        </div>
      </div>

      <div className="section-list">
        <div className="stat-row">
          <span>Parcel Coverage</span>
          <strong>{(selectedField.coverage * 100).toFixed(0)}%</strong>
        </div>
        <div className="stat-row">
          <span>Treated Area</span>
          <strong>{selectedField.treatedAreaHa.toFixed(2)} ha</strong>
        </div>
        <div className="stat-row">
          <span>Parcel Area</span>
          <strong>{selectedField.totalAreaHa.toFixed(2)} ha</strong>
        </div>
        <div className="stat-row">
          <span>Applied on Parcel</span>
          <strong>{selectedField.appliedLiters.toFixed(0)} L</strong>
        </div>
        <div className="stat-row">
          <span>Target Plan</span>
          <strong>{selectedField.targetLiters.toFixed(0)} L</strong>
        </div>
      </div>

      <div className="section-list">
        <div className="section-title">Fleet Status</div>
        {snapshot.drones.map(drone => (
          <div key={drone.id} className="drone-row">
            <span>Drone {drone.id + 1}</span>
            <BatteryBar level={drone.batteryLevel} />
            <span className="drone-status" style={{ color: statusColor(drone.status) }}>
              {drone.routeProgress > 0 ? `${Math.round(drone.routeProgress * 100)}%` : statusLabel(drone.status)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function BatteryBar({ level }: { level: number }) {
  const color = level > 0.5 ? '#40e040' : level > 0.2 ? '#e0c540' : '#ef6657'
  return (
    <div className="battery-shell">
      <div style={{ width: `${level * 100}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  )
}
