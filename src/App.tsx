import { Fragment, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Entity } from 'resium';

import CssBaseline from '@mui/material/CssBaseline';
import {
  Autocomplete,
  Backdrop,
  Box,
  Card,
  CardContent,
  Divider,
  Drawer,
  FormControlLabel,
  LinearProgress,
  Skeleton,
  Slider,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Switch,
  TextField,
} from '@mui/material';


import { LatLng, LatLngBox } from './common';
import { createSolarPanelEntity, degreesToMeters, metersToDegrees, normalize, renderImage, renderImagePalette, solarPanelPolygon } from './utils';

import InfoCard from './components/InfoCard';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import Show from './components/Show';

import { BuildingInsightsResponse, SolarPanel, SolarPanelConfig, findClosestBuilding } from './services/solar/buildingInsights';
import { ImagePixels, getDataLayers, DataLayersResponse, LayerId, downloadLayer, DataLayerPixels, layerChoices } from './services/solar/dataLayers';
import { Typography } from '@mui/material';
import { TypedArray } from 'geotiff';
import DataLayerChoice from './components/DataLayerChoice';

const cesiumApiKey = import.meta.env.VITE_CESIUM_API_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/* 
TODO
- Add data layers with time of day slider
- Add icon for roof pitch and azimuth
- Add icon to show the energy produced with respect with the highest panel
- Color the selected solar panel
- Add list of predefined locations
- Color panels by energy produced
- Add slider to adjust energy produced to match average household per state
*/

const SIDEBAR_WIDTH = {
  xs: '380px',
  lg: '460px',
};

function getSolarInsights(buildingInsights: BuildingInsightsResponse) {
  return {
    'Carbon offset factor': `${Math.round(buildingInsights.solarPotential.carbonOffsetFactorKgPerMwh)} Kg/MWh`,
    'Maximum sunshine': `${Math.round(buildingInsights.solarPotential.maxSunshineHoursPerYear)} hr/year`,
    'Maximum array': `${buildingInsights.solarPotential.solarPanels.length} panels`,
    'Imagery date': buildingInsights.imageryDate,
  }
}

function getSolarPanelDetails(buildingInsights: BuildingInsightsResponse, panel: SolarPanel) {
  const roof = buildingInsights.solarPotential.roofSegmentStats[panel.segmentIndex ?? 0]
  return {
    'Estimated energy': `${Math.round(panel.yearlyEnergyDcKwh)} KWh/year`,
    'Orientation': panel.orientation == 'LANDSCAPE' ? 'Landscape' : 'Portrait',
    'Roof pitch': `${Math.round(roof.pitchDegrees)}°`,
    'Roof azimuth': `${Math.round(roof.azimuthDegrees)}°`,
  }
}


export default function App() {
  const mapRef = useRef<{ cesiumElement: Cesium.Viewer }>(null)

  // Information to display in the UI.
  const [buildingInsights, setBuildingInsights] = useState<BuildingInsightsResponse | null>(null)
  const [solarPanel, setSolarPanel] = useState<SolarPanel | null>(null)
  const [solarPanels, setSolarPanels] = useState<SolarPanel[]>([])
  const [layer, setLayer] = useState<DataLayerPixels | null>(null)

  // Inputs from the UI.
  const [inputWattsPerMonth, setInputWattsPerMonth] = useState<number>(0)
  const [inputDataLayer, setInputDataLayer] = useState<LayerId>('dsm')
  const [inputMonth, setInputMonth] = useState<number>(3)
  const [inputDay, setInputDay] = useState<number>(14)
  const [inputHour, setInputHour] = useState<number>(15)
  const [inputMask, setInputMask] = useState<boolean>(true)


  async function showSolarPotential(point: LatLng) {
    const viewer = mapRef?.current?.cesiumElement!
    viewer.entities.removeAll()
    setBuildingInsights(null)
    setLayer(null)

    // Fetch the building insights from the Solar API.
    const buildingInsights = await findClosestBuilding(point, googleMapsApiKey)
    setBuildingInsights(buildingInsights)

    // Set the solar panels on the map.
    const solarConfigNum = 0 // TODO: calculate from wattsPerMonth
    const solarPanelConfig = buildingInsights.solarPotential.solarPanelConfigs[solarConfigNum]
    setSolarPanels(buildingInsights.solarPotential.solarPanels.slice(0, solarPanelConfig.panelsCount))

    // Set the data layer on the map.
    showDataLayer(buildingInsights, inputDataLayer)
  }

  async function showDataLayer(buildingInsights: BuildingInsightsResponse, inputDataLayer: LayerId) {
    setLayer(null)

    const box = buildingInsights.boundingBox
    const layer = await downloadLayer({
      layerId: inputDataLayer,
      sizeMeters: Math.ceil(degreesToMeters(Math.max(
        box.ne.latitude - box.sw.latitude,
        box.ne.longitude - box.sw.longitude,
      ))),
      center: buildingInsights.center,
      googleMapsApiKey: googleMapsApiKey,
    })

    setLayer(layer)
  }

  function renderDataLayer(layer: DataLayerPixels): HTMLCanvasElement {
    return layerChoices[inputDataLayer].render({
      canvas: document.getElementById('data-layer') as HTMLCanvasElement,
      layer: layer,
      mask: inputMask
        ? layer.mask
        : { ...layer.mask, bands: [layer.mask.bands[0].map((_: any) => 1)] },
      month: inputMonth,
      day: inputDay,
      hour: inputHour,
    })
  }

  return <Box sx={{ display: 'flex' }}>
    <CssBaseline />

    {/* Content area */}
    <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
      <Map
        ref={mapRef}
        cesiumApiKey={cesiumApiKey}
        googleMapsApiKey={googleMapsApiKey}
        onClick={showSolarPotential}
        onHover={entity =>
          setSolarPanel(
            buildingInsights && entity && entity.name
              ? buildingInsights.solarPotential.solarPanels[parseInt(entity.name)]
              : null
          )
        }
      >

        { // Solar panels
          buildingInsights ?
            solarPanels.map((panel, i) => {
              const roofSegment = buildingInsights.solarPotential.roofSegmentStats[panel.segmentIndex ?? 0]
              return createSolarPanelEntity({
                key: i,
                panel: panel,
                panelWidth: buildingInsights.solarPotential.panelWidthMeters,
                panelHeight: buildingInsights.solarPotential.panelHeightMeters,
                azimuth: roofSegment.azimuthDegrees,
              })
            })
            : null
        }

        <canvas id='data-layer'></canvas>
        { // Data layer
          layer ?
            <Entity
              rectangle={{
                coordinates: Cesium.Rectangle.fromDegrees(
                  layer.west, layer.south,
                  layer.east, layer.north,
                ),
                material: new Cesium.ImageMaterialProperty({
                  image: renderDataLayer(layer),
                  transparent: true,
                })
              }}
            />
            : null
        }
      </Map>
    </Box>

    {/* Side bar */}
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: SIDEBAR_WIDTH.xs,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: SIDEBAR_WIDTH.xs,
          boxSizing: 'border-box'
        },
      }}
    >

      <Box sx={{ overflow: 'auto', p: 1 }}>
        <SearchBar
          googleMapsApiKey={googleMapsApiKey}
          initialAddress='921 West San Gabriel Avenue, Fresno, CA'
          onPlaceChanged={async place => {
            const viewer = mapRef?.current?.cesiumElement!
            showSolarPotential(place.center)
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(place.center.longitude, place.center.latitude - 2e-4, 90.0),
              orientation: {
                pitch: Cesium.Math.toRadians(-45.0),
              },
              // https://developers.google.com/maps/documentation/tile/use-renderer#camera-orbit
              complete: () => { },
            })
          }}
        />

        <Box padding={2}>
          <DataLayerChoice
            layerId={inputDataLayer}
            layer={layer}
            month={{ get: inputMonth, set: setInputMonth }}
            day={{ get: inputDay, set: setInputDay }}
            hour={{ get: inputHour, set: setInputHour }}
            mask={{ get: inputMask, set: setInputMask }}
            onChange={layerId => {
              if (buildingInsights && layerId) {
                setInputDataLayer(layerId)
                showDataLayer(buildingInsights, layerId)
              }
            }}
          />
        </Box>

        {/* Solar insights */}
        <Card variant='outlined'>
          <CardContent>
            <Typography variant='subtitle1'>Building insights</Typography>
            {buildingInsights
              ? // Building insights data
              <Show data={getSolarInsights(buildingInsights)} />
              : // Loading animation
              <Box padding={2} sx={{ width: '100%' }}>
                <Skeleton />
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </Box>
            }
          </CardContent>
        </Card>
      </Box>

    </Drawer >

    <Box sx={{ position: 'absolute' }}>
      {buildingInsights && solarPanel ?
        <Box padding={1}>
          <InfoCard
            title="Solar panel details"
            content={getSolarPanelDetails(buildingInsights, solarPanel)}
          />
        </Box>
        : null
      }

    </Box>
  </Box >
}
