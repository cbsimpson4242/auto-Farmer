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
  background: '#1a2e1a',
  fieldBorder: '#4a7a3a',
  cellEmpty: '#5a9a4a',
  cellCovered: '#2d5a2d',
  cellCoveredDot: '#80cc60',
  cellObstacle: '#8b6914',
  cellObstacleStroke: '#6b4e10',
  droneBody: '#e0e0ff',
  droneWorking: '#60ff60',
  droneReturning: '#ff8060',
  droneCharging: '#60c0ff',
  droneIdle: '#c0c0c0',
  batteryGreen: '#40e040',
  batteryYellow: '#e0e040',
  batteryRed: '#e04040',
  baseStation: '#555577',
  basePad: '#444466',
  hudText: '#e0e0d0',
  trailColor: 'rgba(200, 255, 200, 0.3)',
} as const

// Canvas
export const CANVAS_PADDING = 20
export const BASE_WIDTH = 80
export const BASE_HEIGHT = 40
