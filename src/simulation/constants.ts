export const GRID_CELL_SIZE_METERS = 18
export const TRAIL_LENGTH = 16

export const BATTERY_DRAIN_PER_CELL = 0.012
export const BATTERY_LOW_THRESHOLD = 0.22
export const CHARGE_RATE = 0.00055

export const DRONE_SPEED = 14
export const FLY_SPEED = 28

export const COLORS = {
  selectedParcel: '#f7d774',
  parcelOutline: '#f5f0cf',
  targetFill: 'rgba(255, 196, 91, 0.18)',
  targetStroke: '#ffc96b',
  coverageFill: 'rgba(86, 196, 105, 0.45)',
  coverageStroke: '#6fe28b',
  exclusionFill: 'rgba(54, 42, 32, 0.66)',
  droneWorking: '#68f1c5',
  droneReturning: '#ff8b6b',
  droneCharging: '#77b4ff',
  droneIdle: '#d7e1f9',
  batteryGreen: '#40e040',
  batteryYellow: '#e0c540',
  batteryRed: '#ef6657',
} as const
