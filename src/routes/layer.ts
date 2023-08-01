import { downloadGeoTIFF, type DataLayersResponse, type GeoTiff, type LayerId, type Bounds } from "./solar";
import { renderPalette, renderRGB } from "./visualize";

export interface Layer {
  id: LayerId;
  render: (showRoofOnly: boolean, month: number, day: number) => HTMLCanvasElement[]
  bounds: Bounds;
  palette?: { colors: string[]; min: string; max: string };
}

const colorPalettes: Record<LayerId, string[]> = {
  mask: ['212121', 'EEEEEE'],
  dsm: ['3949AB', '81D4FA', '66BB6A', 'FFE082', 'E53935'],
  rgb: [],
  annualFlux: ['00000A', '91009C', 'E64616', 'FEB400', 'FFFFF6'],
  monthlyFlux: ['00000A', '91009C', 'E64616', 'FEB400', 'FFFFF6'],
  hourlyShade: ['212121', 'FFCA28']
};

export async function getLayer(layerId: LayerId, urls: DataLayersResponse, googleMapsApiKey: string): Promise<Layer> {
  console.log(`Render layer: ${layerId}`);
  const get: Record<LayerId, () => Promise<Layer>> = {
    mask: async () => {
      const mask = await downloadGeoTIFF(urls.maskUrl, googleMapsApiKey);
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colorPalettes[layerId],
          min: 'No roof',
          max: 'Roof'
        },
        render: (showRoofOnly) => [
          renderPalette({
            data: mask,
            mask: showRoofOnly ? mask : undefined,
            colors: colorPalettes[layerId],
          })
        ]
      };
    },
    dsm: async () => {
      const [mask, data] = await Promise.all([
        downloadGeoTIFF(urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF(urls.dsmUrl, googleMapsApiKey)
      ]);
      const sortedValues = Array.from(data.rasters[0]).sort((x, y) => x - y);
      const minValue = sortedValues[0];
      const maxValue = sortedValues.slice(-1)[0];
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colorPalettes[layerId],
          min: `${minValue.toFixed(1)} m`,
          max: `${maxValue.toFixed(1)} m`
        },
        render: (showRoofOnly) => [
          renderPalette({
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colorPalettes[layerId],
            min: sortedValues[0],
            max: sortedValues.slice(-1)[0],
          })
        ]
      };
    },
    rgb: async () => {
      const [mask, data] = await Promise.all([
        downloadGeoTIFF(urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF(urls.rgbUrl, googleMapsApiKey)
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
        downloadGeoTIFF(urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF(urls.annualFluxUrl, googleMapsApiKey)
      ]);
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colorPalettes[layerId],
          min: 'Shady',
          max: 'Sunny'
        },
        render: (showRoofOnly) => [
          renderPalette({
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colorPalettes[layerId],
            min: 0,
            max: 1800,
          })
        ]
      };
    },
    monthlyFlux: async () => {
      const [mask, data] = await Promise.all([
        downloadGeoTIFF(urls.maskUrl, googleMapsApiKey),
        downloadGeoTIFF(urls.monthlyFluxUrl, googleMapsApiKey)
      ]);
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colorPalettes[layerId],
          min: 'Shady',
          max: 'Sunny'
        },
        render: (showRoofOnly) => [...Array(12).keys()].map((month) =>
          renderPalette({
            data: data,
            mask: showRoofOnly ? mask : undefined,
            colors: colorPalettes[layerId],
            min: 0,
            max: 200,
            index: month,
          })
        )
      };
    },
    hourlyShade: async () => {
      const [mask, ...months] = await Promise.all([
        downloadGeoTIFF(urls.maskUrl, googleMapsApiKey),
        ...urls.hourlyShadeUrls.map(url => downloadGeoTIFF(url, googleMapsApiKey))
      ]);
      return {
        id: layerId,
        bounds: mask.bounds,
        palette: {
          colors: colorPalettes[layerId],
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
            colors: colorPalettes[layerId],
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
