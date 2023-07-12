import * as Cesium from 'cesium';
import { Entity } from 'resium';
import { TypedArray } from 'geotiff';
import { SolarPanel } from './services/solar/buildingInsights';
import { LatLngBox } from './common';

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
