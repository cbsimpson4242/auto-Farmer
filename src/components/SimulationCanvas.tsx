import type { RefObject } from 'react'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement>
}

export function SimulationCanvas({ canvasRef }: Props) {
  return (
    <div className="canvas-frame">
      <div className="canvas-header">
        <div>
          <p className="canvas-label">Live map</p>
          <h2>Field simulation</h2>
        </div>
        <span className="canvas-chip">Coverage feed</span>
      </div>
      <canvas ref={canvasRef} className="simulation-canvas" />
    </div>
  )
}
