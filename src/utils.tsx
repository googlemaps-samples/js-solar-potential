import * as Cesium from 'cesium';
import { Entity } from 'resium';
import { TypedArray } from 'geotiff';
import { LatLng } from './common';
import { ImagePixels } from './services/solar/dataLayers';
import { BuildingInsightsResponse, SolarPanel } from './services/solar/buildingInsights';

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
export function solarPanelPolygon(center: LatLng, width: number, height: number, azimuth: number) {
  // Get a corner of the solar panel in degrees.
  const corner = new Cesium.Cartesian2(
    metersToDegrees(width) / 2,
    metersToDegrees(height) / 2,
  )

  // Rotate the corner the the panel's azimuth orientation.
  const d = Cesium.Matrix2.multiplyByVector(
    Cesium.Matrix2.fromRotation(Cesium.Math.toRadians(azimuth)),
    corner, new Cesium.Cartesian2()
  )

  // Create the polygon at the panel's location.
  const [west, south] = [center.longitude - d.x, center.latitude - d.y]
  const [east, north] = [center.longitude + d.x, center.latitude + d.y]
  return Cesium.Cartesian3.fromDegreesArray([
    west, south,
    east, south,
    east, north,
    west, north,
    west, south,
  ])
}

export function createSolarPanelEntity({ key, panel, panelWidth, panelHeight, azimuth }: {
  key: number,
  panel: SolarPanel,
  panelWidth: number,
  panelHeight: number,
  azimuth: number,
}) {
  const [width, height] = panel.orientation == 'LANDSCAPE'
    ? [panelHeight, panelWidth]
    : [panelWidth, panelHeight]
  const polygon = solarPanelPolygon(panel.center, width, height, azimuth)
  return <Entity
    key={key}
    polygon={{
      hierarchy: polygon,
      material: Cesium.Color.WHITE.withAlpha(0),
      zIndex: 1,
    }
    }
    polyline={{
      positions: polygon,
      clampToGround: true,
      material: Cesium.Color.BLUE,
      width: 3,
      zIndex: 2,
    }}
  />
}
