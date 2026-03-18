import React from 'react'

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement>
}

export function SimulationCanvas({ canvasRef }: Props) {
  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        background: '#1a2e1a',
        borderRadius: 4,
      }}
    />
  )
}
