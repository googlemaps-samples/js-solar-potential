import { TypedArray, fromArrayBuffer } from 'geotiff';
import * as geokeysToProj4 from 'geotiff-geokeys-to-proj4';
import proj4 from 'proj4';
import { Date, LatLngBox } from '../../common';
import { LatLng } from '../../common';
import { lerp, normalizeArray } from '../../utils';

export type LayerId
  = 'mask'
  | 'dsm'
  | 'rgb'
  | 'annualFlux'
  | 'monthlyFlux'
  | 'hourlyShade'

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
  console.log(`Download ${url}`)
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
