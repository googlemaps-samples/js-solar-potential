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
  = 'mask'
  | 'dsm'
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
    choice: LayerChoice,
    layer: DataLayer,
    mask: ImagePixels,
    month?: number,
    day?: number,
    hour?: number,
  }) => HTMLCanvasElement
  min: (layer: DataLayer) => number
  max: (layer: DataLayer) => number
  palette: string[]
}

const maskPalette = ['212121', 'EEEEEE']
const dsmPalette = ['3949AB', '81D4FA', '66BB6A', 'FFE082', 'E53935']
const fluxPalette = ['311B92', 'FF7043', 'FFB74D', 'FFE0B2']
const shadePalette = ['212121', 'FFCA28']

export const layerChoices: Record<LayerId, LayerChoice> = {
  mask: {
    label: 'Roof mask',
    urls: response => [response.maskUrl],
    render: ({ choice, layer, mask }) => renderImagePalette({
      data: layer.images[0],
      mask: mask,
      palette: choice.palette,
      min: choice.min(layer),
      max: choice.max(layer),
    }),
    min: _ => 0,
    max: _ => 1,
    palette: maskPalette,
  },
  dsm: {
    label: 'Digital Surface Map (DSM)',
    urls: response => [response.dsmUrl],
    render: ({ choice, layer, mask }) => renderImagePalette({
      data: layer.images[0],
      mask: mask,
      palette: choice.palette,
      min: choice.min(layer),
      max: choice.max(layer),
    }),
    // @ts-ignore
    min: layer => layer.images[0].bands[0].valueOf().reduce(
      (x: number, y: number) => Math.min(x, y),
      Number.POSITIVE_INFINITY),
    // @ts-ignore
    max: layer => layer.images[0].bands[0].valueOf().reduce(
      (x: number, y: number) => Math.max(x, y),
      Number.NEGATIVE_INFINITY),
    palette: dsmPalette,
  },
  rgb: {
    label: 'Aerial image (RGB)',
    urls: response => [response.rgbUrl],
    render: ({ layer, mask }) => renderImage({
      rgb: layer.images[0],
      mask: mask,
    }),
    min: _ => 0,
    max: _ => 255,
    palette: [],
  },
  annualFlux: {
    label: 'Annual sunshine (flux)',
    urls: response => [response.annualFluxUrl],
    render: ({ choice, layer, mask }) => renderImagePalette({
      data: layer.images[0],
      mask: mask,
      palette: choice.palette,
      min: choice.min(layer),
      max: choice.max(layer),
    }),
    min: _ => 0,
    max: _ => 2000,
    palette: fluxPalette,
  },
  monthlyFlux: {
    label: 'Monthly sunshine (flux)',
    urls: response => [response.monthlyFluxUrl],
    render: ({ choice, layer, mask, month }) => renderImagePalette({
      data: {
        ...layer.images[0],
        bands: [layer.images[0].bands[month!]],
      },
      mask: mask,
      palette: choice.palette,
      min: choice.min(layer),
      max: choice.max(layer),
    }),
    min: _ => 0,
    max: _ => 200,
    palette: fluxPalette,
  },
  hourlyShade: {
    label: 'Hourly shade',
    urls: response => response.hourlyShadeUrls,
    render: ({ choice, layer, mask, month, day, hour }) => renderImagePalette({
      data: {
        ...layer.images[month!],
        bands: [
          layer.images[month!].bands[hour!]
            .map(x => x & (1 << (day! - 1))),
        ],
      },
      mask: mask,
      palette: choice.palette,
      min: choice.min(layer),
      max: choice.max(layer),
    }),
    min: _ => 0,
    max: _ => 1,
    palette: shadePalette,
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
  response: DataLayersResponse,
  layerId: LayerId,
  sizeMeters: number,
  center: LatLng,
  googleMapsApiKey: string
}): Promise<DataLayer> {
  const choice = layerChoices[args.layerId]
  const requests = choice.urls(args.response).map(url => downloadGeoTIFF(url, args.googleMapsApiKey))

  const dw = metersToDegrees(args.sizeMeters / 2)
  const dh = metersToDegrees(args.sizeMeters / 2)
  return {
    mask: await downloadGeoTIFF(args.response.maskUrl, args.googleMapsApiKey),
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

function renderImage({ rgb, mask }: { rgb: ImagePixels, mask: ImagePixels }) {
  // https://www.w3schools.com/tags/canvas_createimagedata.asp
  const canvas = document.createElement('canvas')
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