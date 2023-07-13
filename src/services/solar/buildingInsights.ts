import { Date } from '../../common'
import { LatLng } from '../../common'
import { LatLngBox } from '../../common'

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
  sunshineQuantiles?: number[]
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

// https://developers.devsite.corp.google.com/maps/documentation/solar/requests#make-building
export async function findClosestBuilding(location: LatLng, apiKey: string): Promise<BuildingInsightsResponse> {
  console.log(`GET buildingInsights ${JSON.stringify(location)}`)
  const params = new URLSearchParams({
    "key": apiKey,
    "location.latitude": location.latitude.toString(),
    "location.longitude": location.longitude.toString(),
  })
  return fetch(`https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`)
    .then(response => response.json())
}
