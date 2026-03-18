import React from 'react'
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
    case 'working': return '#60ff60'
    case 'returning': return '#ff8060'
    case 'charging': return '#60c0ff'
    case 'flying_to_field': return '#e0e0ff'
    default: return '#c0c0c0'
  }
}

export function StatsPanel({ snapshot }: Props) {
  return (
    <div>
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <span style={dimStyle}>Elapsed:</span>
          <span>{formatTime(snapshot.elapsedMs)}</span>
        </div>
        <div style={rowStyle}>
          <span style={dimStyle}>Fertilizer:</span>
          <span>{snapshot.totalFertilizer.toFixed(1)}L</span>
        </div>
      </div>

      <div style={{ ...sectionStyle, borderTop: '1px solid #3a3a3a' }}>
        <div style={rowStyle}>
          <span style={dimStyle}>Total Coverage:</span>
          <span style={{ color: '#80ff80', fontWeight: 'bold' }}>
            {(snapshot.totalCoverage * 100).toFixed(0)}%
          </span>
        </div>
        {snapshot.fieldCoverage.map(fc => (
          <div key={fc.id} style={rowStyle}>
            <span style={dimStyle}>{fc.label}:</span>
            <span>{(fc.coverage * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <div style={{ ...sectionStyle, borderTop: '1px solid #3a3a3a' }}>
        <div style={{ ...dimStyle, marginBottom: 6 }}>Drones</div>
        {snapshot.drones.map(d => (
          <div key={d.id} style={{ ...rowStyle, alignItems: 'center' }}>
            <span style={{ minWidth: 55 }}>Drone {d.id + 1}</span>
            <BatteryBar level={d.batteryLevel} />
            <span style={{ color: statusColor(d.status), fontSize: 11, minWidth: 50, textAlign: 'right' }}>
              {statusLabel(d.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BatteryBar({ level }: { level: number }) {
  const color = level > 0.5 ? '#40e040' : level > 0.2 ? '#e0e040' : '#e04040'
  return (
    <div style={{ width: 50, height: 8, background: '#333', borderRadius: 2, marginRight: 8 }}>
      <div style={{ width: `${level * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  )
}

const sectionStyle: React.CSSProperties = {
  padding: '8px 0',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '2px 0',
  fontSize: 13,
  fontFamily: 'monospace',
  color: '#e0e0d0',
}

const dimStyle: React.CSSProperties = {
  color: '#a0a090',
  fontSize: 12,
}
