import { TypedArray, fromArrayBuffer } from 'geotiff';
import * as geokeysToProj4 from 'geotiff-geokeys-to-proj4';
import proj4 from 'proj4';
import { Date, LatLngBox } from '../../common';
import { LatLng } from '../../common';
import { lerp, normalize } from '../../utils';

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

export interface GeoTiffData {
  width: number
  height: number
  rasters: TypedArray[]
  boundingBox: LatLngBox
}

export type LayerId
  = 'mask'
  | 'dsm'
  | 'rgb'
  | 'annualFlux'
  | 'monthlyFlux'
  | 'hourlyShade'

export interface DataLayerDeprecated {
  id: LayerId
  images: GeoTiffData[]
  mask: GeoTiffData
  west: number
  south: number
  east: number
  north: number
}

interface LayerChoice {
  label: string
  urls: (response: DataLayersResponse) => string[]
  min: (layer: DataLayerDeprecated) => number
  max: (layer: DataLayerDeprecated) => number
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
    min: _ => 0,
    max: _ => 1,
    palette: maskPalette,
  },
  dsm: {
    label: 'Digital Surface Map (DSM)',
    urls: response => [response.dsmUrl],
    // @ts-ignore
    min: layer => layer.images[0].rasters[0].valueOf().reduce(
      (x: number, y: number) => Math.min(x, y),
      Number.POSITIVE_INFINITY),
    // @ts-ignore
    max: layer => layer.images[0].rasters[0].valueOf().reduce(
      (x: number, y: number) => Math.max(x, y),
      Number.NEGATIVE_INFINITY),
    palette: dsmPalette,
  },
  rgb: {
    label: 'Aerial image (RGB)',
    urls: response => [response.rgbUrl],
    min: _ => 0,
    max: _ => 255,
    palette: [],
  },
  annualFlux: {
    label: 'Annual sunshine (flux)',
    urls: response => [response.annualFluxUrl],
    min: _ => 0,
    max: _ => 2000,
    palette: fluxPalette,
  },
  monthlyFlux: {
    label: 'Monthly sunshine (flux)',
    urls: response => [response.monthlyFluxUrl],
    min: _ => 0,
    max: _ => 200,
    palette: fluxPalette,
  },
  hourlyShade: {
    label: 'Hourly shade',
    urls: response => response.hourlyShadeUrls,
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

export async function downloadGeoTIFF(url: string, apiKey: string): Promise<GeoTiffData> {
  const solarUrl = url.includes('solar.googleapis.com') ? url + `?key=${apiKey}` : url
  const response = await fetch(solarUrl)
  const arrayBuffer = await response.arrayBuffer()
  const geotiff = await fromArrayBuffer(arrayBuffer);
  const image = await geotiff.getImage()
  const rasters = await image.readRasters()

  // Reproject the bounding box into coordinates.
  const geoKeys = image.getGeoKeys()
  const projObj = geokeysToProj4.toProj4(geoKeys)
  const projection = proj4(projObj.proj4, "WGS84")
  const box = image.getBoundingBox()
  const sw = projection.forward({
    x: box[0] * projObj.coordinatesConversionParameters.x,
    y: box[1] * projObj.coordinatesConversionParameters.y,
  })
  const ne = projection.forward({
    x: box[2] * projObj.coordinatesConversionParameters.x,
    y: box[3] * projObj.coordinatesConversionParameters.y,
  })

  return {
    width: rasters.width,
    height: rasters.height,
    rasters: Array.from({ length: rasters.length }, (_, i) => rasters[i].valueOf() as TypedArray),
    boundingBox: {
      ne: { longitude: ne.x, latitude: ne.y },
      sw: { longitude: sw.x, latitude: sw.y },
    },
  }
}

export function renderImage({ rgb, mask }: {
  rgb: GeoTiffData,
  mask?: GeoTiffData
}) {
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

export function renderImagePalette({ data, mask, palette }: {
  data: GeoTiffData,
  palette: { colors: string[], min: number, max: number }
  mask?: GeoTiffData,
}) {
  const n = 256
  const colors = palette.colors.map(hex => ({
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  }))
  const step = (colors.length - 1) / (n - 1)
  const pixels = Array(n).fill(0).map((_, i) => {
    const index = i * step
    const j = Math.floor(index)
    const k = Math.ceil(index)
    return {
      r: lerp(colors[j].r, colors[k].r, index - j),
      g: lerp(colors[j].g, colors[k].g, index - j),
      b: lerp(colors[j].b, colors[k].b, index - j),
    }
  })

  const indices = normalize(data.rasters[0], {
    xMin: palette.min,
    xMax: palette.max,
    yMin: 0,
    yMax: n - 1,
  }).map(Math.round)

  return renderImage({
    rgb: {
      ...data,
      rasters: [
        indices.map((i: number) => pixels[i].r),
        indices.map((i: number) => pixels[i].g),
        indices.map((i: number) => pixels[i].b),
      ],
    },
    mask: mask,
  })
}