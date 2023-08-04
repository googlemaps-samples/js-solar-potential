import type { GeoTiff } from "./solar"

export function renderRGB(rgb: GeoTiff, mask?: GeoTiff) {
  // https://www.w3schools.com/tags/canvas_createimagedata.asp
  const canvas = document.createElement('canvas')
  canvas.width = mask ? mask.width : rgb.width
  canvas.height = mask ? mask.height : rgb.height

  const dw = rgb.width / canvas.width
  const dh = rgb.height / canvas.height

  const ctx = canvas.getContext('2d')!
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const imgIdx = y * canvas.width * 4 + x * 4
      const rgbIdx = Math.floor(y * dh) * rgb.width + Math.floor(x * dw)
      const maskIdx = y * canvas.width + x
      img.data[imgIdx + 0] = rgb.rasters[0][rgbIdx]  // Red
      img.data[imgIdx + 1] = rgb.rasters[1][rgbIdx]  // Green
      img.data[imgIdx + 2] = rgb.rasters[2][rgbIdx]  // Blue
      img.data[imgIdx + 3] = mask                    // Alpha
        ? mask.rasters[0][maskIdx] * 255
        : 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

export function renderPalette({ data, mask, colors, min, max, index }: {
  data: GeoTiff,
  mask?: GeoTiff,
  colors?: string[],
  min?: number,
  max?: number,
  index?: number,
}) {
  const n = 256
  const palette = createPalette(colors ?? ['000000', 'ffffff'], n)
  const indices = data.rasters[index ?? 0].map(x => normalize(x, max ?? 1, min ?? 0)).map(x => Math.round(x * (n - 1)))
  return renderRGB(
    {
      ...data,
      rasters: [
        indices.map((i: number) => palette[i].r),
        indices.map((i: number) => palette[i].g),
        indices.map((i: number) => palette[i].b),
      ],
    },
    mask,
  )
}

export function createPalette(hexColors: string[], size = 256) {
  const rgb = hexColors.map(colorToRGB)
  const step = (rgb.length - 1) / (size - 1)
  return Array(size).fill(0).map((_, i) => {
    const index = i * step
    const j = Math.floor(index)
    const k = Math.ceil(index)
    return {
      r: lerp(rgb[j].r, rgb[k].r, index - j),
      g: lerp(rgb[j].g, rgb[k].g, index - j),
      b: lerp(rgb[j].b, rgb[k].b, index - j),
    }
  })
}

export function colorToRGB(color: string): { r: number, g: number, b: number } {
  const hex = color.startsWith('#') ? color.slice(1) : color
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }
}

export function rgbToColor({ r, g, b }: { r: number, g: number, b: number }): string {
  const f = (x: number) => {
    const hex = Math.round(x).toString(16)
    return hex.length == 1 ? `0${hex}` : hex
  }
  return `#${f(r)}${f(g)}${f(b)}`
}

export function normalize(x: number, max: number = 1, min: number = 0) {
  const y = (x - min) / (max - min)
  return clamp(y, 0, 1)
}

export function lerp(x: number, y: number, t: number) {
  return x + t * (y - x)
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max)
}