/*
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

			https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// [START solar_api_data_types]
export interface DataLayersResponse {
  imageryDate: Date;
  imageryProcessedDate: Date;
  dsmUrl: string;
  rgbUrl: string;
  maskUrl: string;
  annualFluxUrl: string;
  monthlyFluxUrl: string;
  hourlyShadeUrls: string[];
  imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// https://developers.google.com/maps/documentation/solar/reference/rest/v1/buildingInsights/findClosest
export interface BuildingInsightsResponse {
  name: string;
  center: LatLng;
  boundingBox: LatLngBox;
  imageryDate: Date;
  imageryProcessedDate: Date;
  postalCode: string;
  administrativeArea: string;
  statisticalArea: string;
  regionCode: string;
  solarPotential: SolarPotential;
  imageryQuality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SolarPotential {
  maxArrayPanelsCount: number;
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  panelLifetimeYears: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  carbonOffsetFactorKgPerMwh: number;
  wholeRoofStats: SizeAndSunshineStats;
  buildingStats: SizeAndSunshineStats;
  roofSegmentStats: RoofSegmentSizeAndSunshineStats[];
  solarPanels: SolarPanel[];
  solarPanelConfigs: SolarPanelConfig[];
  financialAnalyses: object;
}

export interface SizeAndSunshineStats {
  areaMeters2: number;
  sunshineQuantiles: number[];
  groundAreaMeters2: number;
}

export interface RoofSegmentSizeAndSunshineStats {
  pitchDegrees: number;
  azimuthDegrees: number;
  stats: SizeAndSunshineStats;
  center: LatLng;
  boundingBox: LatLngBox;
  planeHeightAtCenterMeters: number;
}

export interface SolarPanel {
  center: LatLng;
  orientation: 'LANDSCAPE' | 'PORTRAIT';
  segmentIndex: number;
  yearlyEnergyDcKwh: number;
}

export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: RoofSegmentSummary[];
}

export interface RoofSegmentSummary {
  pitchDegrees: number;
  azimuthDegrees: number;
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  segmentIndex: number;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LatLngBox {
  sw: LatLng;
  ne: LatLng;
}

export interface Date {
  year: number;
  month: number;
  day: number;
}

export interface RequestError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}
// [END solar_api_data_types]

// https://developers.google.com/maps/documentation/solar/reference/rest/v1/dataLayers
export type LayerId = 'mask' | 'dsm' | 'rgb' | 'annualFlux' | 'monthlyFlux' | 'hourlyShade';

// [START solar_api_building_insights]
/**
 * Fetches the building insights information from the Solar API.
 *   https://developers.google.com/maps/documentation/solar/requests#make-building
 *
 * @param  {LatLng} location      Point of interest as latitude longitude.
 * @param  {string} apiKey        Google Cloud API key.
 * @return {Promise<DataLayersResponse>}  Building Insights response.
 */
export async function findClosestBuilding(
  location: google.maps.LatLng,
  apiKey: string,
): Promise<BuildingInsightsResponse> {
  const args = {
    'location.latitude': location.lat().toFixed(5),
    'location.longitude': location.lng().toFixed(5),
  };
  console.log('GET buildingInsights\n', args);
  const params = new URLSearchParams({ ...args, key: apiKey });
  return fetch(`https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`).then(
    async (response) => {
      const content = await response.json();
      if (response.status != 200) {
        console.error('findClosestBuilding\n', content);
        throw content;
      }
      console.log('buildingInsightsResponse', content);
      return content;
    },
  );
}
// [END solar_api_building_insights]

// [START solar_api_data_layers]
/**
 * Fetches the data layers information from the Solar API.
 *   https://developers.google.com/maps/documentation/solar/requests#make-data
 *
 * @param  {LatLng} location      Point of interest as latitude longitude.
 * @param  {number} radiusMeters  Radius of the data layer size in meters.
 * @param  {string} apiKey        Google Cloud API key.
 * @return {Promise<DataLayersResponse>}  Data Layers response.
 */
export async function getDataLayerUrls(
  location: LatLng,
  radiusMeters: number,
  apiKey: string,
): Promise<DataLayersResponse> {
  const args = {
    'location.latitude': location.latitude.toFixed(5),
    'location.longitude': location.longitude.toFixed(5),
    radius_meters: radiusMeters.toString(),
  };
  console.log('GET dataLayers\n', args);
  const params = new URLSearchParams({ ...args, key: apiKey });
  return fetch(`https://solar.googleapis.com/v1/dataLayers:get?${params}`).then(
    async (response) => {
      const content = await response.json();
      if (response.status != 200) {
        console.error('getDataLayerUrls\n', content);
        throw content;
      }
      console.log('dataLayersResponse', content);
      return content;
    },
  );
}
// [END solar_api_data_layers]

// [START solar_api_data_layer_custom_type]
export interface GeoTiff {
  width: number;
  height: number;
  rasters: Array<number>[];
  bounds: Bounds;
}
// [END solar_api_data_layer_custom_type]

// [START solar_api_download_geotiff]
// npm install geotiff geotiff-geokeys-to-proj4 proj4

import * as geotiff from 'geotiff';
import * as geokeysToProj4 from 'geotiff-geokeys-to-proj4';
import proj4 from 'proj4';

/**
 * Downloads the pixel values for a Data Layer URL from the Solar API.
 *
 * @param  {string} url        URL from the Data Layers response.
 * @param  {string} apiKey     Google Cloud API key.
 * @return {Promise<GeoTiff>}  Pixel values with shape and lat/lon bounds.
 */
export async function downloadGeoTIFF(url: string, apiKey: string): Promise<GeoTiff> {
  console.log(`Downloading data layer: ${url}`);

  // Include your Google Cloud API key in the Data Layers URL.
  const solarUrl = url.includes('solar.googleapis.com') ? url + `&key=${apiKey}` : url;
  const response = await fetch(solarUrl);
  if (response.status != 200) {
    const error = await response.json();
    console.error(`downloadGeoTIFF failed: ${url}\n`, error);
    throw error;
  }

  // Get the GeoTIFF rasters, which are the pixel values for each band.
  const arrayBuffer = await response.arrayBuffer();
  const tiff = await geotiff.fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage();
  const rasters = await image.readRasters();

  // Reproject the bounding box into lat/lon coordinates.
  const geoKeys = image.getGeoKeys();
  const projObj = geokeysToProj4.toProj4(geoKeys);
  const projection = proj4(projObj.proj4, 'WGS84');
  const box = image.getBoundingBox();
  const sw = projection.forward({
    x: box[0] * projObj.coordinatesConversionParameters.x,
    y: box[1] * projObj.coordinatesConversionParameters.y,
  });
  const ne = projection.forward({
    x: box[2] * projObj.coordinatesConversionParameters.x,
    y: box[3] * projObj.coordinatesConversionParameters.y,
  });

  return {
    // Width and height of the data layer image in pixels.
    // Used to know the row and column since Javascript
    // stores the values as flat arrays.
    width: rasters.width,
    height: rasters.height,
    // Each raster reprents the pixel values of each band.
    // We convert them from `geotiff.TypedArray`s into plain
    // Javascript arrays to make them easier to process.
    rasters: [...Array(rasters.length).keys()].map((i) =>
      Array.from(rasters[i] as geotiff.TypedArray),
    ),
    // The bounding box as a lat/lon rectangle.
    bounds: {
      north: ne.y,
      south: sw.y,
      east: ne.x,
      west: sw.x,
    },
  };
}
// [END solar_api_download_geotiff]

export function showLatLng(point: LatLng) {
  return `(${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)})`;
}

export function showDate(date: Date) {
  return `${date.month}/${date.day}/${date.year}`;
}
