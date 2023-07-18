import ReactDOMServer from 'react-dom/server'
import * as Cesium from 'cesium';
import { Entity } from 'resium';
import { TypedArray } from 'geotiff';
import { RoofSegmentSizeAndSunshineStats, SolarPanel, SolarPanelConfig } from './services/solar/buildingInsights';
import { LatLng, LatLngBox } from './common';
import { DataLayersResponse, GeoTiffData, LayerId, downloadGeoTIFF, getDataLayers } from './services/solar/dataLayers';

export interface DataLayer {
  id: LayerId
  images: HTMLCanvasElement[]
  boundingBox: LatLngBox
  masked: boolean
  cache: {
    hash: string,
    data: GeoTiffData
    mask: GeoTiffData
  }
  palette?: { colors: string[], min: number, max: number }
  day: number
}

export interface SolarPanelEntity {
  name: string
  position: Cesium.Cartesian3
  orientation: Cesium.Quaternion
  dimensions: Cesium.Cartesian3
  roofIdx: number
  description: string
}

const palettes = {
  mask: ['212121', 'EEEEEE'],
  dsm: ['3949AB', '81D4FA', '66BB6A', 'FFE082', 'E53935'],
  flux: ['311B92', 'FF7043', 'FFB74D', 'FFE0B2'],
  shade: ['212121', 'FFCA28'],
}

export async function flyTo({
  viewer,
  point,
  cameraAngle,
  cameraDistance,
  onStart,
  onEnd,
}: {
  viewer: Cesium.Viewer,
  point: LatLng,
  cameraAngle: number,
  cameraDistance: number,
  onStart?: () => void,
  onEnd?: (args: { position: Cesium.Cartesian3, offset: Cesium.HeadingPitchRange }) => void,
}) {
  if (onStart) {
    onStart()
  }

  // Unlock the camera.
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)

  // Get the necessary information for the camera placement.
  const coordinates = Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude)
  const position = (await viewer.scene.clampToHeightMostDetailed([coordinates]))[0]
  const offset = new Cesium.HeadingPitchRange(0, cameraAngle, cameraDistance)

  // Fly to the location.
  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(position),
    {
      offset: offset,
      complete: () => {
        if (onEnd) {
          onEnd({ position: position, offset: offset })
        }
      }
    }
  )
}

export async function createSolarPanels({
  viewer,
  roofSegments,
  panels,
  panelWidth,
  panelHeight,
  panelDepth,
  info,
}: {
  viewer: Cesium.Viewer,
  roofSegments: RoofSegmentSizeAndSunshineStats[],
  panels: SolarPanel[],
  panelWidth: number,
  panelHeight: number,
  panelDepth: number,
  info: (panel: SolarPanel, roof: RoofSegmentSizeAndSunshineStats, roofIdx: number) => Record<string, string | JSX.Element>,
}): Promise<SolarPanelEntity[]> {
  const coordinates = panels.map(panel => Cesium.Cartesian3.fromDegrees(panel.center.longitude, panel.center.latitude))
  const positions = await viewer.scene.clampToHeightMostDetailed(coordinates, [], 1)
  return panels.map((panel, i) => {
    const coords = Cesium.Cartographic.fromCartesian(positions[i])
    const position = Cesium.Cartesian3.fromRadians(coords.longitude, coords.latitude, coords.height + panelDepth)
    const roofIdx = panel.segmentIndex ?? 0
    const [width, height] = panel.orientation == 'LANDSCAPE'
      ? [panelWidth, panelHeight]
      : [panelHeight, panelWidth]
    const azimuth = roofSegments[roofIdx].azimuthDegrees ?? 0
    const pitch = roofSegments[roofIdx].pitchDegrees ?? 0
    return {
      name: `Solar panel ${i}`,
      position: position,
      orientation: Cesium.Transforms.headingPitchRollQuaternion(
        position,
        Cesium.HeadingPitchRoll.fromDegrees(azimuth + 90, pitch, 0)
      ),
      dimensions: new Cesium.Cartesian3(width, height, panelDepth),
      roofIdx: roofIdx,
      description: ReactDOMServer.renderToStaticMarkup(infoTable(
        info(panel, roofSegments[roofIdx], roofIdx)
      )),
    }
  })
}

export function createRoofPins({
  viewer,
  solarConfig,
  roofStats,
  roofColors,
}: {
  viewer: Cesium.Viewer,
  solarConfig: SolarPanelConfig,
  roofStats: RoofSegmentSizeAndSunshineStats[],
  roofColors: string[],
}) {
  const pinBuilder = new Cesium.PinBuilder()
  return solarConfig.roofSegmentSummaries
    .map((roof, i) => {
      const idx = roof.segmentIndex ?? 0
      const color = roofColors[idx % roofColors.length]
      const center = roofStats[idx].center
      const coordinates = Cesium.Cartesian3.fromDegrees(center.longitude, center.latitude)
      const size = normalize(roof.panelsCount ?? 0, { xMin: 0, xMax: 200, yMin: 30, yMax: 80 })
      return <Entity key={i}
        name={`Roof segment ${i}`}
        position={viewer.scene.clampToHeight(coordinates)}
        billboard={{
          image: pinBuilder.fromText(
            roof.panelsCount.toString(),
            Cesium.Color.fromCssColorString(color),
            Math.round(size),
          ).toDataURL(),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        }}
      />
    })
}


export async function renderDataLayer({
  inputLayerId,
  inputMask,
  inputMonth,
  inputDay,
  dataLayer,
  dataLayersResponse,
  googleMapsApiKey,
}: {
  inputLayerId: LayerId,
  inputMask: boolean,
  inputMonth: number,
  inputDay: number,
  dataLayer: DataLayer | null,
  dataLayersResponse: DataLayersResponse,
  googleMapsApiKey: string,
}) {
  function isCacheValid(hash: string) {
    return dataLayer?.cache.hash === hash
      && dataLayer?.masked === inputMask
      && dataLayer?.day === inputDay
  }

  const render: Record<LayerId, (() => Promise<DataLayer>)> = {
    mask: async () => {
      const hash = 'mask'
      const mask = dataLayer && hash == dataLayer.cache.hash
        ? dataLayer.cache.mask
        : await downloadGeoTIFF(dataLayersResponse.maskUrl, googleMapsApiKey)
      if (dataLayer && isCacheValid(hash)) {
        return dataLayer
      }
      const palette = { colors: palettes.mask, min: 0, max: 1 }
      return {
        id: inputLayerId,
        images: [renderImagePalette({
          data: mask,
          mask: inputMask ? mask : undefined,
          palette: palette,
        })],
        masked: inputMask,
        cache: { hash: hash, data: mask, mask: mask },
        day: inputDay,
        boundingBox: mask.boundingBox,
        palette: palette,
      }
    },
    dsm: async () => {
      const hash = 'dsm'
      const [data, mask] = dataLayer && hash == dataLayer.cache.hash
        ? [dataLayer.cache.data, dataLayer.cache.mask]
        : await Promise.all([
          downloadGeoTIFF(dataLayersResponse.dsmUrl, googleMapsApiKey),
          downloadGeoTIFF(dataLayersResponse.maskUrl, googleMapsApiKey),
        ])
      if (dataLayer && isCacheValid(hash)) {
        return dataLayer
      }
      const sortedValues = Array.from(data.rasters[0]).sort((x, y) => x - y)
      const palette = {
        colors: palettes.dsm,
        min: sortedValues[0],
        max: sortedValues[sortedValues.length - 1],
      }
      return {
        id: inputLayerId,
        images: [renderImagePalette({
          data: data,
          mask: inputMask ? mask : undefined,
          palette: palette,
        })],
        masked: inputMask,
        cache: { hash: hash, data: data, mask: mask },
        day: inputDay,
        boundingBox: mask.boundingBox,
        palette: palette,
      }
    },
    rgb: async () => {
      const hash = 'rgb'
      const [data, mask] = dataLayer && hash == dataLayer.cache.hash
        ? [dataLayer.cache.data, dataLayer.cache.mask]
        : await Promise.all([
          downloadGeoTIFF(dataLayersResponse.rgbUrl, googleMapsApiKey),
          downloadGeoTIFF(dataLayersResponse.maskUrl, googleMapsApiKey),
        ])
      if (dataLayer && isCacheValid(hash)) {
        return dataLayer
      }
      return {
        id: inputLayerId,
        images: [renderImageRGB({
          rgb: data,
          mask: inputMask ? mask : undefined,
        })],
        masked: inputMask,
        cache: { hash: hash, data: data, mask: mask },
        day: inputDay,
        boundingBox: mask.boundingBox,
      }
    },
    annualFlux: async () => {
      const hash = 'annualFlux'
      const [data, mask] = dataLayer && hash == dataLayer.cache.hash
        ? [dataLayer.cache.data, dataLayer.cache.mask]
        : await Promise.all([
          downloadGeoTIFF(dataLayersResponse.annualFluxUrl, googleMapsApiKey),
          downloadGeoTIFF(dataLayersResponse.maskUrl, googleMapsApiKey),
        ])
      if (dataLayer && isCacheValid(hash)) {
        return dataLayer
      }
      const palette = { colors: palettes.flux, min: 0, max: 2000 }
      return {
        id: inputLayerId,
        images: [renderImagePalette({
          data: data,
          mask: inputMask ? mask : undefined,
          palette: palette,
        })],
        masked: inputMask,
        cache: { hash: hash, data: data, mask: mask },
        day: inputDay,
        boundingBox: mask.boundingBox,
        palette: palette,
      }
    },
    monthlyFlux: async () => {
      const hash = 'monthlyFlux'
      const [data, mask] = dataLayer && hash == dataLayer.cache.hash
        ? [dataLayer.cache.data, dataLayer.cache.mask]
        : await Promise.all([
          downloadGeoTIFF(dataLayersResponse.monthlyFluxUrl, googleMapsApiKey),
          downloadGeoTIFF(dataLayersResponse.maskUrl, googleMapsApiKey),
        ])
      if (dataLayer && isCacheValid(hash)) {
        return dataLayer
      }
      const palette = { colors: palettes.flux, min: 0, max: 200 }
      return {
        id: inputLayerId,
        images: Array(12).fill(0).map((_, month) =>
          renderImagePalette({
            data: data,
            mask: inputMask ? mask : undefined,
            palette: palette,
            index: month,
          })
        ),
        masked: inputMask,
        cache: { hash: hash, data: data, mask: mask },
        day: inputDay,
        boundingBox: mask.boundingBox,
        palette: palette,
      }
    },
    hourlyShade: async () => {
      const hash = `hourlyShade:${inputMonth}`
      const [data, mask] = dataLayer && hash == dataLayer.cache.hash
        ? [dataLayer.cache.data, dataLayer.cache.mask]
        : await Promise.all([
          downloadGeoTIFF(dataLayersResponse.hourlyShadeUrls[inputMonth], googleMapsApiKey),
          downloadGeoTIFF(dataLayersResponse.maskUrl, googleMapsApiKey),
        ])
      if (dataLayer && isCacheValid(hash)) {
        return dataLayer
      }
      const palette = { colors: palettes.shade, min: 0, max: 1 }
      return {
        id: inputLayerId,
        images: Array(24).fill(0).map((_, hour) =>
          renderImagePalette({
            data: {
              ...data,
              rasters: data.rasters
                .map(array => array.map(x => x & (1 << (inputDay - 1))))
            },
            mask: inputMask ? mask : undefined,
            palette: palette,
            index: hour,
          })
        ),
        masked: inputMask,
        cache: { hash: hash, data: data, mask: mask },
        day: inputDay,
        boundingBox: mask.boundingBox,
        palette: palette,
      }
    }
  }
  return render[inputLayerId]()
}

export function infoTable(info: Record<string, string | JSX.Element>) {
  return <table className="cesium-infoBox-defaultTable">
    {Object.keys(info).map((field, i) =>
      <tr key={i}>
        <td>{field}</td>
        <td>{info[field]}</td>
      </tr>
    )
    }
  </table>
}

export function boundingBoxSize(box: LatLngBox) {
  const nw = Cesium.Cartesian3.fromDegrees(box.sw.longitude, box.ne.latitude)
  const ne = Cesium.Cartesian3.fromDegrees(box.ne.longitude, box.ne.latitude)
  const sw = Cesium.Cartesian3.fromDegrees(box.sw.longitude, box.sw.latitude)
  const horizontal = Cesium.Cartesian3.distance(nw, ne)
  const vertical = Cesium.Cartesian3.distance(nw, sw)
  return Math.max(horizontal, vertical)
}

export function renderImageRGB({ rgb, mask }: {
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

export function renderImagePalette({ data, mask, palette, index }: {
  data: GeoTiffData,
  palette: { colors: string[], min: number, max: number }
  mask?: GeoTiffData,
  index?: number,
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

  const indices = normalizeArray(data.rasters[index ?? 0], {
    xMin: palette.min,
    xMax: palette.max,
    yMin: 0,
    yMax: n - 1,
  }).map(Math.round)

  return renderImageRGB({
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

export function normalizeArray(array: TypedArray, args: { xMin?: number, xMax?: number, yMin?: number, yMax?: number }) {
  return array.map(x => normalize(x, args))
}

export function normalize(x: number, args: { xMin?: number, xMax?: number, yMin?: number, yMax?: number }) {
  const xMin = args.xMin ?? 0
  const xMax = args.xMax ?? 1
  const yMin = args.yMin ?? 0
  const yMax = args.yMax ?? 1
  const y = (x - xMin) / (xMax - xMin) * (yMax - yMin) + yMin
  return clamp(y, yMin, yMax)
}

export function lerp(x: number, y: number, t: number) {
  return x + t * (y - x)
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max)
}
