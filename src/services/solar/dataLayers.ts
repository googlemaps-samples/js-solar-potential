import { TypedArray, fromArrayBuffer } from 'geotiff';
import { Date } from '../../common';
import { LatLng } from '../../common';
import { lerp, metersToDegrees, normalize } from '../../utils';

export interface DataLayersResponse {
  imageryDate: Date
  imageryProcessedDate: Date
  dsmUrl: string
  rgbUrl: string
  maskUrl: string
  annualFluxUrl: string
  monthlyFluxUrl: string
  hourlyShadeUrls: string[]
  imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface ImagePixels {
  width: number
  height: number
  bands: TypedArray[]
}

export type LayerId
  = 'dsm'
  | 'rgb'
  | 'annualFlux'
  | 'monthlyFlux'
  | 'hourlyShade'

export interface DataLayer {
  images: ImagePixels[]
  mask: ImagePixels
  west: number
  south: number
  east: number
  north: number
}

interface LayerChoice {
  label: string
  urls: (response: DataLayersResponse) => string[]
  render: (args: {
    canvas: HTMLCanvasElement,
    layer: DataLayer,
    mask: ImagePixels,
    month?: number,
    day?: number,
    hour?: number
  }) => HTMLCanvasElement
}

const dsmPalette = ['0D47A1', '00BCD4', '1B5E20', 'FFCA28', 'B71C1C']
const fluxPalette = ['212121', '1A237E', '7B1FA2', 'FB8C00', 'FFB74D', 'FFFDE7']
const shadePalette = ['212121', 'FFCA28']

export const layerChoices: Record<LayerId, LayerChoice> = {
  dsm: {
    label: 'Digital Surface Map (DSM)',
    urls: response => [response.dsmUrl],
    render: ({ canvas, layer, mask }) => {
      const minValue = layer.images[0].bands[0].valueOf().reduce(
        (x: number, y: number) => Math.min(x, y),
        Number.POSITIVE_INFINITY)
      return renderImagePalette({
        canvas: canvas,
        data: layer.images[0],
        mask: mask,
        palette: dsmPalette,
        min: minValue,
        max: minValue + 10,
      })
    }
  },
  rgb: {
    label: 'Aerial image (RGB)',
    urls: response => [response.rgbUrl],
    render: ({ canvas, layer, mask }) => renderImage({
      canvas: canvas,
      rgb: layer.images[0],
      mask: mask,
    }),
  },
  annualFlux: {
    label: 'Annual flux',
    urls: response => [response.annualFluxUrl],
    render: ({ canvas, layer, mask }) => renderImagePalette({
      canvas: canvas,
      data: layer.images[0],
      mask: mask,
      palette: fluxPalette,
      max: 2000,
    }),
  },
  monthlyFlux: {
    label: 'Monthly flux',
    urls: response => [response.monthlyFluxUrl],
    render: ({ canvas, layer, mask, month }) => renderImagePalette({
      canvas: canvas,
      data: {
        ...layer.images[0],
        bands: [layer.images[0].bands[month!]],
      },
      mask: mask,
      palette: fluxPalette,
      max: 200,
    }),
  },
  hourlyShade: {
    label: 'Hourly shade',
    urls: response => response.hourlyShadeUrls,
    render: ({ canvas, layer, mask, month, day, hour }) => renderImagePalette({
      canvas: canvas,
      data: {
        ...layer.images[month!],
        bands: [
          layer.images[month!].bands[hour!]
            .map(x => x & (1 << (day! - 1))),
        ],
      },
      mask: mask,
      palette: shadePalette,
    }),
  },
}

// https://developers.devsite.corp.google.com/maps/documentation/solar/requests#make-data
export async function getDataLayers(location: LatLng, radius_meters: number, apiKey: string): Promise<DataLayersResponse> {
  console.log(`GET dataLayers ${JSON.stringify(location)} ${radius_meters}`)
  const params = new URLSearchParams({
    "key": apiKey,
    "location.latitude": location.latitude.toString(),
    "location.longitude": location.longitude.toString(),
    "radius_meters": radius_meters.toString(),
  })
  return fetch(`https://solar.googleapis.com/v1/dataLayers:get?${params}`)
    .then(response => response.json())
}

export async function downloadLayer(args: {
  layerId: LayerId,
  sizeMeters: number,
  center: LatLng,
  googleMapsApiKey: string
}): Promise<DataLayer> {
  const response = await getDataLayers(args.center, args.sizeMeters / 2, args.googleMapsApiKey)
  const choice = layerChoices[args.layerId]
  const requests = choice.urls(response).map(url => downloadGeoTIFF(url, args.googleMapsApiKey))

  const dw = metersToDegrees(args.sizeMeters / 2) * 1.3
  const dh = metersToDegrees(args.sizeMeters / 2)
  return {
    mask: await downloadGeoTIFF(response.maskUrl, args.googleMapsApiKey),
    images: await Promise.all(requests),
    west: args.center.longitude - dw,
    south: args.center.latitude - dh,
    east: args.center.longitude + dw,
    north: args.center.latitude + dh,
  }
}

async function downloadGeoTIFF(url: string, apiKey: string): Promise<ImagePixels> {
  const solarUrl = url.includes('solar.googleapis.com') ? url + `?key=${apiKey}` : url
  const response = await fetch(solarUrl)
  const arrayBuffer = await response.arrayBuffer()
  const geotiff = await fromArrayBuffer(arrayBuffer);
  const image = await geotiff.getImage()
  const rasters = await image.readRasters()
  return {
    width: rasters.width,
    height: rasters.height,
    bands: Array.from({ length: rasters.length }, (_, i) => rasters[i].valueOf() as TypedArray)
  }
}

function renderImage({ canvas, rgb, mask }: {
  canvas: HTMLCanvasElement,
  rgb: ImagePixels,
  mask: ImagePixels
}) {
  // https://www.w3schools.com/tags/canvas_createimagedata.asp
  canvas.width = mask.width
  canvas.height = mask.height

  const dw = rgb.width / canvas.width
  const dh = rgb.height / canvas.height

  const ctx = canvas.getContext('2d')!
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const imgIdx = y * canvas.width * 4 + x * 4
      const rgbIdx = Math.floor(y * dh) * rgb.width + Math.floor(x * dw)
      const maskIdx = y * canvas.width + x
      img.data[imgIdx + 0] = rgb.bands[0][rgbIdx]         // Red
      img.data[imgIdx + 1] = rgb.bands[1][rgbIdx]         // Green
      img.data[imgIdx + 2] = rgb.bands[2][rgbIdx]         // Blue
      img.data[imgIdx + 3] = mask.bands[0][maskIdx] * 255 // Alpha
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

function renderImagePalette(args: {
  canvas: HTMLCanvasElement,
  data: ImagePixels,
  mask: ImagePixels,
  palette?: string[],
  min?: number,
  max?: number,
}) {
  const n = 256
  const palette = (args.palette ?? ['000000', 'ffffff']).map(hex => ({
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }))
  const step = (palette.length - 1) / (n - 1)
  const colors = Array(n).fill(null).map((_, i) => {
    const index = i * step
    const j = Math.floor(index)
    const k = Math.ceil(index)
    return {
      r: lerp(palette[j].r, palette[k].r, index - j),
      g: lerp(palette[j].g, palette[k].g, index - j),
      b: lerp(palette[j].b, palette[k].b, index - j),
    }
  })

  const indices = normalize(args.data.bands[0], {
    xMin: args.min,
    xMax: args.max,
    yMin: 0,
    yMax: n - 1,
  }).map(Math.round)

  return renderImage({
    canvas: args.canvas,
    rgb: {
      width: args.data.width,
      height: args.data.height,
      bands: [
        indices.map(i => colors[i].r),
        indices.map(i => colors[i].g),
        indices.map(i => colors[i].b),
      ],
    },
    mask: args.mask,
  })
}