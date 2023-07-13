import ReactDOMServer from 'react-dom/server'
import * as Cesium from 'cesium';
import { BoxGraphics, Entity } from 'resium';
import { TypedArray } from 'geotiff';
import { RoofSegmentSizeAndSunshineStats, SolarPanel } from './services/solar/buildingInsights';
import { LatLng, LatLngBox } from './common';
import { LayerId, getDataLayers } from './services/solar/dataLayers';

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
  colors,
  info,
}: {
  viewer: Cesium.Viewer,
  roofSegments: RoofSegmentSizeAndSunshineStats[],
  panels: SolarPanel[],
  panelWidth: number,
  panelHeight: number,
  colors: string[],
  info: (panel: SolarPanel, roof: RoofSegmentSizeAndSunshineStats, color: string) => Record<string, string | JSX.Element>,
}): Promise<JSX.Element[]> {
  const coordinates = panels.map(panel => Cesium.Cartesian3.fromDegrees(panel.center.longitude, panel.center.latitude))
  const positions = await viewer.scene.clampToHeightMostDetailed(coordinates, [], panelWidth)
  return panels.map((panel, i) => {
    const position = positions[i]
    const roofIdx = panel.segmentIndex ?? 0
    const [width, height] = panel.orientation == 'LANDSCAPE'
      ? [panelWidth, panelHeight]
      : [panelHeight, panelWidth]
    const azimuth = roofSegments[roofIdx].azimuthDegrees ?? 0
    const pitch = roofSegments[roofIdx].pitchDegrees ?? 0
    const color = colors[roofIdx % colors.length]
    return <Entity key={i}
      name={`Solar panel ${i}`}
      description={info
        ? ReactDOMServer.renderToStaticMarkup(infoTable(
          info(panel, roofSegments[roofIdx], color)
        ))
        : undefined
      }
      position={position}
      orientation={
        Cesium.Transforms.headingPitchRollQuaternion(
          position,
          Cesium.HeadingPitchRoll.fromDegrees(azimuth + 90, pitch, 0)
        )
      }
      height={1}
    >
      <BoxGraphics
        dimensions={new Cesium.Cartesian3(width, height, 1)}
        material={Cesium.Color.fromCssColorString(color).withAlpha(0.8)}
        outline={true}
        outlineColor={Cesium.Color.BLACK}
      />
    </Entity >
  })
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

export function normalize(array: TypedArray, args: { xMin?: number, xMax?: number, yMin?: number, yMax?: number }) {
  const xMin = args.xMin ?? 0
  const xMax = args.xMax ?? 1
  const yMin = args.yMin ?? 0
  const yMax = args.yMax ?? 1
  return array
    .map(x => (x - xMin) / (xMax - xMin) * (yMax - yMin) + yMin)
    .map(y => clamp(y, yMin, yMax))
}

export function lerp(x: number, y: number, t: number) {
  return x + t * (y - x)
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max)
}
