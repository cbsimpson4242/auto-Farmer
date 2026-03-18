const tileCache = new Map<string, HTMLImageElement>()

// Origin tile coordinates for a realistic farmland area (Iowa, USA)
const START_Z = 17
const START_X = 31640
const START_Y = 48712
const TILE_SIZE = 256

export function renderMap(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const cols = Math.ceil(width / TILE_SIZE)
  const rows = Math.ceil(height / TILE_SIZE)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const z = START_Z
      const x = START_X + c
      const y = START_Y + r

      const tileKey = `${z}/${y}/${x}`
      const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

      let img = tileCache.get(tileKey)

      if (!img) {
        // Create a new image and start loading
        img = new Image()
        // Use crossOrigin to avoid canvas tainting
        img.crossOrigin = 'anonymous'
        img.src = url
        tileCache.set(tileKey, img)
      }

      if (img.complete && img.naturalHeight !== 0) {
        // Draw the image if it's fully loaded
        ctx.drawImage(img, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      } else {
        // While loading, draw a subtle dark background
        ctx.fillStyle = '#1e1e1e'
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      }
    }
  }
}
