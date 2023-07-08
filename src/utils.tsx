import * as Cesium from 'cesium';
import { Entity } from 'resium';
import { TypedArray } from 'geotiff';
import { SolarPanel } from './services/solar/buildingInsights';

const metersPerDegree = 111139

export function metersToDegrees(meters: number) {
  return meters / metersPerDegree
}

export function degreesToMeters(degrees: number) {
  return degrees * metersPerDegree
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

export function solarPanelPolygon(panel: SolarPanel, width: number, height: number, azimuth: number) {
  // Define the panel's polygon vertices.
  const x = metersToDegrees(width) / 2
  const y = metersToDegrees(height) / 2
  const vertices = [
    new Cesium.Cartesian2(+x, +y),
    new Cesium.Cartesian2(+x, -y),
    new Cesium.Cartesian2(-x, -y),
    new Cesium.Cartesian2(-x, +y),
    new Cesium.Cartesian2(+x, +y),
  ]

  // Rotate and translate the vertices.
  const orientation = panel.orientation == 'LANDSCAPE' ? 90 : 0
  const rotation = Cesium.Matrix2.fromRotation(Cesium.Math.toRadians(orientation + azimuth))
  const position = new Cesium.Cartesian2(panel.center.longitude, panel.center.latitude)
  return Cesium.Cartesian3.fromDegreesArray(vertices
    // Rotate panel
    .map(vertex => Cesium.Matrix2.multiplyByVector(rotation, vertex, new Cesium.Cartesian2()))
    // Translate panel
    .map(vertex => Cesium.Cartesian2.add(position, vertex, new Cesium.Cartesian2()))
    // Convert to a flat array
    .flatMap(vertex => [vertex.x, vertex.y])
  )
}

// TODO: inline
export function createSolarPanelEntity({ key, panel, panelWidth, panelHeight, azimuth }: {
  key: number,
  panel: SolarPanel,
  panelWidth: number,
  panelHeight: number,
  azimuth: number,
}) {
  return <Entity
    key={key}
    polyline={{
      positions: solarPanelPolygon(panel, panelWidth, panelHeight, azimuth),
      clampToGround: true,
      material: Cesium.Color.BLUE,
      width: 4,
      zIndex: 1,
    }}
  />
}
