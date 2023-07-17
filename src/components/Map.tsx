import { Cesium3DTileset, Viewer } from "resium"
import { PropsWithChildren, forwardRef, useEffect } from 'react'
import * as Cesium from "cesium"
import { LatLng } from '../common'

interface Props {
  cesiumApiKey?: string
  googleMapsApiKey?: string
  onClick?: (point: LatLng) => void
  onDoubleClick?: (point: LatLng) => void
  onHover?: (entity?: Cesium.Entity) => void
  onMouseDown?: (position: Cesium.Cartesian2) => void
}

interface ClickEvent {
  position: Cesium.Cartesian2
}

interface MouseMoveEvent {
  startPosition: Cesium.Cartesian2
  endPosition: Cesium.Cartesian2
}

const Map = forwardRef<{ cesiumElement: Cesium.Viewer }, PropsWithChildren<Props>>((props, ref) => {
  const onClick = props.onClick ?? (_ => { })
  const onDoubleClick = props.onDoubleClick ?? (_ => { })
  const onHover = props.onHover ?? (_ => { })
  const onMouseDown = props.onMouseDown ?? (_ => { })
  if (props.cesiumApiKey) {
    Cesium.Ion.defaultAccessToken = props.cesiumApiKey
  }
  Cesium.RequestScheduler.requestsByServer["tile.googleapis.com:443"] = 18

  useEffect(() => {
    // @ts-ignore
    const viewer: Cesium.Viewer = ref?.current.cesiumElement
    Cesium.createGooglePhotorealistic3DTileset(props.googleMapsApiKey)
      .then(tileset => viewer.scene.primitives.add(tileset))
      .catch(err => console.error(`Failed to load tileset: ${err}`))
  }, [])

  return <Viewer
    ref={ref}
    animation={false}
    baseLayer={false}
    baseLayerPicker={false}
    geocoder={false}
    fullscreenButton={false}
    homeButton={false}
    scene3DOnly={true}
    timeline={false}
    style={{
      flexBasis: "100%",
      height: "100vh",
    }}
    onClick={(event: ClickEvent) => {
      // @ts-ignore
      const viewer: Cesium.Viewer = ref?.current.cesiumElement
      const cartesian3 = viewer.scene.pickPosition(event.position)
      const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cartesian3)
      onClick({
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
      })
    }}
    onDoubleClick={(event: ClickEvent) => {
      // @ts-ignore
      const viewer: Cesium.Viewer = ref?.current.cesiumElement
      const cartesian3 = viewer.scene.pickPosition(event.position)
      const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cartesian3)
      onDoubleClick({
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
      })
    }}
    onMouseMove={(event: MouseMoveEvent) => {
      // @ts-ignore
      const viewer: Cesium.Viewer = ref?.current.cesiumElement
      const picked = viewer.scene.pick(event.endPosition)
      onHover(picked && picked.id ? picked.id : null)
    }}
    onMouseDown={(event: { position: Cesium.Cartesian2 }) =>
      onMouseDown(event.position)
    }
  >

    {props.children}

  </Viewer>
})

export default Map