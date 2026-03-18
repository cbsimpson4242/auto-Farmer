export const CELL_SIZE = 14
export const DRONE_SIZE = 6
export const TRAIL_LENGTH = 6

// Battery
export const BATTERY_DRAIN_PER_CELL = 0.008
export const BATTERY_LOW_THRESHOLD = 0.20
export const CHARGE_RATE = 0.0005 // per ms

// Speed
export const DRONE_SPEED = 120 // pixels per second
export const FLY_SPEED = 200   // pixels per second (transit speed)

// Fertilizer per cell
export const FERTILIZER_PER_CELL = 0.5 // liters

// Colors
export const COLORS = {
  background: '#0f172a',
  fieldBorder: 'rgba(255, 255, 255, 0.3)',
  cellEmpty: 'rgba(0, 0, 0, 0)', // Fully transparent
  cellCovered: 'rgba(59, 130, 246, 0.4)', // Semi-transparent blue
  cellCoveredDot: 'rgba(96, 165, 250, 0.6)',
  cellObstacle: 'rgba(239, 68, 68, 0.3)', // Semi-transparent red
  cellObstacleStroke: 'rgba(239, 68, 68, 0.5)',
  droneBody: '#f8fafc',
  droneWorking: '#60a5fa',
  droneReturning: '#94a3b8',
  droneCharging: '#fbbf24',
  droneIdle: '#475569',
  batteryGreen: '#22c55e',
  batteryYellow: '#eab308',
  batteryRed: '#ef4444',
  baseStation: 'rgba(30, 41, 59, 0.8)',
  basePad: 'rgba(51, 65, 85, 0.8)',
  hudText: '#94a3b8',
  trailColor: 'rgba(59, 130, 246, 0.4)',
} as const

// Canvas
export const CANVAS_PADDING = 20
export const BASE_WIDTH = 80
export const BASE_HEIGHT = 40
