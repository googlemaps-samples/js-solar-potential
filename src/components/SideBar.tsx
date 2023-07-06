import * as Cesium from 'cesium'
import SearchBar from './SearchBar'
import { PropsWithChildren, useState } from 'react'
import { LatLng, Place } from '../common'
import { BuildingInsights, SolarPanel, findClosestBuilding } from '../services/solar/buildingInsights'
import { ImagePixels } from '../services/solar/dataLayers'

interface Props {
  googleMapsApiKey: string
  initialAddress?: string
  onPlaceChanged?: (place: Place) => void
}

export default function SideBar(props: PropsWithChildren<Props>) {
  return <>
    <SearchBar
      googleMapsApiKey={props.googleMapsApiKey}
      initialAddress={props.initialAddress}
      onPlaceChanged={props.onPlaceChanged}
    />

  </>
}