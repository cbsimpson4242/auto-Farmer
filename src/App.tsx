import { useEffect, useMemo, useState } from 'react'
import { useSimulation } from './hooks/useSimulation'
import { MapView } from './components/MapView'
import { ControlPanel } from './components/ControlPanel'
import { StatsPanel } from './components/StatsPanel'

export default function App() {
  const {
    sim,
    snapshot,
    isRunning,
    isPaused,
    onStart,
    onPause,
    onReset,
    onSpeedChange,
    onDroneCountChange,
    onTargetFieldChange,
  } = useSimulation()
  const [selectedFieldId, setSelectedFieldId] = useState(snapshot.mission.targetFieldId ?? 0)

  useEffect(() => {
    if (!snapshot.fieldCoverage.some(field => field.id === selectedFieldId) && snapshot.fieldCoverage[0]) {
      setSelectedFieldId(snapshot.fieldCoverage[0].id)
    }
  }, [selectedFieldId, snapshot.fieldCoverage])

  const selectedField = useMemo(
    () => snapshot.fieldCoverage.find(field => field.id === selectedFieldId) ?? snapshot.fieldCoverage[0],
    [selectedFieldId, snapshot.fieldCoverage],
  )

  return (
    <div className="app-shell">
      <div className="map-panel">
        <div className="map-header">
          <div>
            <p className="eyebrow">Field Ops Simulation</p>
            <h1>Satellite-guided fertilization training</h1>
          </div>
          <p className="map-copy">
            Inspect real-shaped parcels, avoid exclusion zones, and watch coverage build across live satellite imagery.
          </p>
        </div>
        <MapView
          sim={sim}
          selectedFieldId={selectedFieldId}
          onSelectField={fieldId => {
            setSelectedFieldId(fieldId)
            onTargetFieldChange(fieldId)
          }}
        />
      </div>

      <div className="sidebar">
        <ControlPanel
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={onStart}
          onPause={onPause}
          onReset={onReset}
          onSpeedChange={onSpeedChange}
          onDroneCountChange={onDroneCountChange}
          droneCount={snapshot.drones.length}
          mission={snapshot.mission}
          selectedFieldLabel={selectedField?.label ?? null}
        />
        {selectedField ? <StatsPanel snapshot={snapshot} selectedField={selectedField} /> : null}
      </div>
    </div>
  )
}
