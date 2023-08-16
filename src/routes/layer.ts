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

import { binaryPalette, ironPalette, rainbowPalette, sunlightPalette } from "./colors";
import { downloadGeoTIFF, type DataLayersResponse, type GeoTiff, type LayerId, type Bounds } from "./solar";
import { renderPalette, renderRGB } from "./visualize";

export interface Palette {
  colors: string[]
  min: string
  max: string
}

export interface Layer {
  id: LayerId;
  render: (showRoofOnly: boolean, month: number, day: number) => HTMLCanvasElement[]
  bounds: Bounds;
  palette?: Palette;
}

export async function getLayer(layerId: LayerId, urls: DataLayersResponse, googleMapsApiKey: string): Promise<Layer> {
  const get: Record<LayerId, () => Promise<Layer>> = {
    mask: async () => {
      const mask = await downloadGeoTIFF('mask', urls.maskUrl, googleMapsApiKey);
      const colors = binaryPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'No roof',
          max: 'Roof'
        },
        render: (showRoofOnly) => [
          renderPalette({
            data: mask,
            mask: showRoofOnly ? mask : undefined,
            colors: colors
          })
        ]
      };
    },
    dsm: async () => {
      const [mask, data] = await Promise.all([
        downloadGeoTIFF('mask', urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF('dsm', urls.dsmUrl, googleMapsApiKey)
      ]);
      const sortedValues = Array.from(data.rasters[0]).sort((x, y) => x - y);
      const minValue = sortedValues[0];
      const maxValue = sortedValues.slice(-1)[0];
      const colors = rainbowPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: `${minValue.toFixed(1)} m`,
          max: `${maxValue.toFixed(1)} m`
        },
        render: (showRoofOnly) => [
          renderPalette({
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colors,
            min: sortedValues[0],
            max: sortedValues.slice(-1)[0],
          })
        ]
      };
    },
    rgb: async () => {
      const [mask, data] = await Promise.all([
        downloadGeoTIFF('mask', urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF('rgb', urls.rgbUrl, googleMapsApiKey)
      ]);
      return {
        id: layerId,
        bounds: mask.bounds,
        render: (showRoofOnly) => [
          renderRGB(data, showRoofOnly ? mask : undefined)
        ]
      };
    },
    annualFlux: async () => {
      const [mask, data] = await Promise.all([
        downloadGeoTIFF('mask', urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF('annualFlux', urls.annualFluxUrl, googleMapsApiKey)
      ]);
      const colors = ironPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'Shady',
          max: 'Sunny'
        },
        render: (showRoofOnly) => [
          renderPalette({
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colors,
            min: 0,
            max: 1800,
          })
        ]
      };
    },
    monthlyFlux: async () => {
      const [mask, data] = await Promise.all([
        downloadGeoTIFF('mask', urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF('annualFlux', urls.monthlyFluxUrl, googleMapsApiKey)
      ]);
      const colors = ironPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'Shady',
          max: 'Sunny'
        },
        render: (showRoofOnly) => [...Array(12).keys()].map((month) =>
          renderPalette({
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colors,
            min: 0,
            max: 200,
            index: month,
          })
        )
      };
    },
    hourlyShade: async () => {
      const [mask, ...months] = await Promise.all([
        downloadGeoTIFF('mask', urls.maskUrl, googleMapsApiKey),
        ...urls.hourlyShadeUrls.map(url => downloadGeoTIFF('hourlyShade', url, googleMapsApiKey))
      ]);
      const colors = sunlightPalette
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colors,
          min: 'Shade',
          max: 'Sun'
        },
        render: (showRoofOnly, month, day) => [...Array(24).keys()].map((hour) =>
          renderPalette({
            data: {
              ...months[month],
              rasters: months[month].rasters.map(values =>
                values.map(x => x & (1 << (day - 1)))
              )
            },
            mask: showRoofOnly ? mask : undefined,
            colors: colors,
            min: 0,
            max: 1,
            index: hour,
          })
        )
      };
    }
  };
  try {
    return get[layerId]()
  } catch (e) {
    console.error(`Error getting layer: ${layerId}\n`, e);
    throw e
  }
}
