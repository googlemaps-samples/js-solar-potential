import { Cesium3DTileset, Viewer } from "resium"
import { PropsWithChildren, forwardRef } from 'react'
import * as Cesium from "cesium"
import { LatLng } from '../common'

interface Props {
  cesiumApiKey?: string
  googleMapsApiKey?: string
  onClick?: (point: LatLng) => void
  onHover?: (entity?: Cesium.Entity) => void
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
  const onHover = props.onHover ?? (_ => { })
  if (props.cesiumApiKey) {
    Cesium.Ion.defaultAccessToken = props.cesiumApiKey
  }
  Cesium.RequestScheduler.requestsByServer["tile.googleapis.com:443"] = 18

  return <Viewer
    ref={ref}
    animation={false}
    baseLayerPicker={false}
    fullscreenButton={false}
    geocoder={false}
    homeButton={false}
    infoBox={false}
    scene3DOnly={true}
    timeline={false}
    style={{
      flexBasis: "100%",
      height: "100vh",
    }}
    onClick={(event: ClickEvent) => {
      const viewer: Cesium.Viewer = ref?.current.cesiumElement
      const cartesian3 = viewer.scene.pickPosition(event.position)
      const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cartesian3)
      onClick({
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
      })
    }}
    onMouseMove={(event: MouseMoveEvent) => {
      const viewer: Cesium.Viewer = ref?.current.cesiumElement
      const picked = viewer.scene.pick(event.endPosition)
      onHover(picked && picked.id ? picked.id : null)
    }}
  >

    {props.googleMapsApiKey ?
      <Cesium3DTileset
        url={`https://tile.googleapis.com/v1/3dtiles/root.json?key=${props.googleMapsApiKey}`}
        showCreditsOnScreen={true}
      />
      : null
    }

    {props.children}

  </Viewer>
})

export default Map