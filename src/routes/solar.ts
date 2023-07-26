import { fromArrayBuffer, type TypedArray } from 'geotiff';
import * as geokeysToProj4 from 'geotiff-geokeys-to-proj4';
import proj4 from 'proj4';

// https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/dataLayers
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

// https://developers.devsite.corp.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest
export interface BuildingInsightsResponse {
  name: string
  center: LatLng
  boundingBox: LatLngBox
  imageryDate: Date
  imageryProcessedDate: Date
  postalCode: string
  administrativeArea: string
  statisticalArea: string
  regionCode: string
  solarPotential: SolarPotential
  imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface SolarPotential {
  maxArrayPanelsCount?: number
  panelCapacityWatts?: number
  panelHeightMeters?: number
  panelWidthMeters?: number
  panelLifetimeYears?: number
  maxArrayAreaMeters2?: number
  maxSunshineHoursPerYear?: number
  carbonOffsetFactorKgPerMwh?: number
  wholeRoofStats: SizeAndSunshineStats
  buildingStats: SizeAndSunshineStats
  roofSegmentStats: RoofSegmentSizeAndSunshineStats[]
  solarPanels: SolarPanel[]
  solarPanelConfigs: SolarPanelConfig[]
  financialAnalyses: {}
}

export interface SizeAndSunshineStats {
  areaMeters2?: number
  sunshineQuantiles: number[]
  groundAreaMeters2?: number
}

export interface RoofSegmentSizeAndSunshineStats {
  pitchDegrees?: number
  azimuthDegrees?: number
  stats: SizeAndSunshineStats
  center: LatLng
  boundingBox: LatLngBox
  planeHeightAtCenterMeters?: number
}

export interface SolarPanel {
  center: LatLng
  orientation: 'LANDSCAPE' | 'PORTRAIT'
  segmentIndex?: number
  yearlyEnergyDcKwh?: number
}

export interface SolarPanelConfig {
  panelsCount: number
  yearlyEnergyDcKwh: number
  roofSegmentSummaries: RoofSegmentSummary[]
}

export interface RoofSegmentSummary {
  pitchDegrees: number
  azimuthDegrees: number
  panelsCount: number
  yearlyEnergyDcKwh: number
  segmentIndex: number
}

export interface LatLng {
  latitude: number
  longitude: number
}

export interface LatLngBox {
  sw: LatLng
  ne: LatLng
}

export interface Date {
  year: number
  month: number
  day: number
}

// https://developers.devsite.corp.google.com/maps/documentation/solar/requests#make-building
export async function findClosestBuilding(location: google.maps.LatLng, apiKey: string): Promise<BuildingInsightsResponse> {
  console.log(`GET buildingInsights ${JSON.stringify(location)}`)
  const params = new URLSearchParams({
    "key": apiKey,
    "location.latitude": location.lat().toString(),
    "location.longitude": location.lng().toString(),
  })
  return fetch(`https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`)
    .then(response => response.json())
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
    rasters: Array(rasters.length).fill(0).map((_, i) => rasters[i] as TypedArray),
    boundingBox: {
      ne: { longitude: ne.x, latitude: ne.y },
      sw: { longitude: sw.x, latitude: sw.y },
    },
  }
}
