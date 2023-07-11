import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import { Entity, BoxGraphics } from 'resium'

import CssBaseline from '@mui/material/CssBaseline'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  Grid,
  Paper,
  Skeleton,
  Slider,
  Stack,
  Switch,
} from '@mui/material'

import { degreesToMeters, solarPanelPolygon } from './utils'

import Map from './components/Map'
import SearchBar from './components/SearchBar'
import Show from './components/Show'

import { BuildingInsightsResponse, findClosestBuilding } from './services/solar/buildingInsights'
import { DataLayer, DataLayersResponse, LayerId, downloadLayer, getDataLayers, layerChoices } from './services/solar/dataLayers'
import { Typography } from '@mui/material'
import DataLayerChoice from './components/DataLayerChoice'
import { Loader } from '@googlemaps/js-api-loader'
import { LatLng } from './common'
import SolarDetails from './components/SolarDetails'
import Palette from './components/Palette'

interface SolarPanelEntity {
  position: Cesium.Cartesian3
  rotation: Cesium.Quaternion
  width: number
  height: number
  roofIdx: number
}

const cesiumApiKey = import.meta.env.VITE_CESIUM_API_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const sidebarWidth = 400

/* TODO:
- 7610 Elphick Road, Sebastopol, CA

- Finalize color palettes
- Reactive design
*/

// https://materialui.co/colors
const colors = [
  '#E53935',  // 600 Red
  '#1E88E5',  // 600 Blue
  '#43A047',  // 600 Green
  '#FB8C00',  // 600 Orange
  '#8E24AA',  // 600 Purple
  '#3949AB',  // 600 Indigo
  '#B71C1C',  // 900 Red
  '#0D47A1',  // 900 Blue
  '#1B5E20',  // 900 Green
  '#E65100',  // 900 Orange
  '#4A148C',  // 900 Purple
  '#1A237E',  // 900 Indigo
  '#E57373',  // 300 Red
  '#7986CB',  // 300 Indigo
  '#81C784',  // 300 Green
  '#FFB74D',  // 300 Orange
  '#BA68C8',  // 300 Purple
]

export default function App() {
  const mapRef = useRef<{ cesiumElement: Cesium.Viewer }>(null)

  // App state.
  const [building, setBuildingInsights] = useState<BuildingInsightsResponse | null>(null)
  const [dataLayersResponse, setDataLayersResponse] = useState<DataLayersResponse | null>(null)
  const [layer, setLayer] = useState<DataLayer | null>(null)
  const [removeOrbit, setRemoveOrbit] = useState<any>()
  const [removeLayerAnimation, setRemoveLayerAnimation] = useState<any>()
  const [errorBuilding, setErrorBuilding] = useState<any>(null)
  const [errorLayer, setErrorLayer] = useState<any>(null)
  const [openMoreDetails, setOpenMoreDetails] = useState(false)

  // Map entities.
  const [solarPanels, setSolarPanels] = useState<SolarPanelEntity[]>([])

  // Inputs from the UI.
  const [inputMonthlyKwh, setInputMonthlyKwh] = useState<number>(1000)
  const [inputDataLayer, setInputDataLayer] = useState<LayerId>('annualFlux')
  const [inputMonth, setInputMonth] = useState<number>(0)
  const [inputDay, setInputDay] = useState<number>(0)
  const [inputHour, setInputHour] = useState<number>(0)
  const [inputMask, setInputMask] = useState<boolean>(true)
  const [inputAnimation, setInputAnimation] = useState<boolean>(true)
  const [inputShowPanels, setInputShowPanels] = useState<boolean>(true)
  const [inputShowPanelCounts, setInputShowPanelCounts] = useState<boolean>(false)

  const googleMapsLoader = new Loader({ apiKey: googleMapsApiKey })
  const elevationLoader = googleMapsLoader
    .importLibrary('core')
    .then(() => new google.maps.ElevationService())

  const layerChoice = layerChoices[inputDataLayer]
  const solarConfigs = building?.solarPotential?.solarPanelConfigs
  const solarConfigIdx = solarConfigs?.findIndex(config => config.yearlyEnergyDcKwh >= inputMonthlyKwh * 12) ?? 0

  async function showSolarPotential(point: LatLng) {
    setBuildingInsights(null)
    setLayer(null)
    setErrorLayer(null)
    setErrorBuilding(null)

    const buildingPromise = findClosestBuilding(point, googleMapsApiKey)
    const elevationPromise = elevationLoader
      .then(service => service.getElevationForLocations({
        locations: [{ lat: point.latitude, lng: point.longitude }]
      }))

    const building = await buildingPromise
    if ('error' in building) {
      console.error(building.error)
      return setErrorBuilding(building.error)
    }
    setBuildingInsights(building)

    const panelPositions = building.solarPotential.solarPanels
      .map(panel => Cesium.Cartesian3.fromDegrees(panel.center.longitude, panel.center.latitude))

    const viewer = mapRef?.current?.cesiumElement!
    const clampedPositions = await viewer.scene.clampToHeightMostDetailed(panelPositions)
    setSolarPanels(building.solarPotential.solarPanels.map((panel, i) => {
      const roof = building.solarPotential.roofSegmentStats[panel.segmentIndex ?? 0]
      const position = clampedPositions[i]
      const width = building.solarPotential.panelWidthMeters
      const height = building.solarPotential.panelHeightMeters
      return {
        position: position,
        rotation: Cesium.Transforms.headingPitchRollQuaternion(
          position,
          Cesium.HeadingPitchRoll.fromDegrees(roof.azimuthDegrees + 90, roof.pitchDegrees, 0)
        ),
        width: panel.orientation == 'LANDSCAPE' ? width : height,
        height: panel.orientation == 'LANDSCAPE' ? height : width,
        roofIdx: panel.segmentIndex ?? 0,
      }
    }))

    const location = Cesium.Cartesian3.fromDegrees(
      building.center.longitude,
      building.center.latitude,
      (await elevationPromise).results[0].elevation * 0.7,
    )
    const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-30), 60)
    viewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(location),
      {
        offset: offset,
        complete: () => {
          // Lock the camera onto a point.
          viewer.scene.camera.lookAtTransform(
            Cesium.Transforms.eastNorthUpToFixedFrame(location),
            offset,
          )
          // Orbit around this point.
          if (removeOrbit) {
            removeOrbit()
          }
          const unsubscribe = viewer.clock.onTick.addEventListener(() =>
            viewer.camera.rotateRight(-0.0002)
          )
          setRemoveOrbit(() => unsubscribe)
        }
      }
    )

    showDataLayer(building, inputDataLayer)
  }

  async function showDataLayer(building: BuildingInsightsResponse, layerId: LayerId) {
    if (!layerId) {
      return
    }

    const sizeMeters = Math.ceil(degreesToMeters(Math.max(
      building.boundingBox.ne.latitude - building.boundingBox.sw.latitude,
      building.boundingBox.ne.longitude - building.boundingBox.sw.longitude,
    )))
    const response = await getDataLayers(building.center, sizeMeters / 2, googleMapsApiKey)
    if ('error' in response) {
      console.error(response.error)
      setDataLayersResponse(null)
      return setErrorLayer(response.error)
    }
    setDataLayersResponse(response)
    setLayer(await downloadLayer({
      response: response,
      layerId: layerId,
      sizeMeters: sizeMeters,
      center: building.center,
      googleMapsApiKey: googleMapsApiKey,
    }))
  }

  function renderDataLayer(layer: DataLayer): HTMLCanvasElement {
    return layerChoice.render({
      choice: layerChoice,
      layer: layer,
      mask: inputMask
        ? layer.mask
        : { ...layer.mask, bands: [layer.mask.bands[0].map((_: any) => 1)] },
      month: inputMonth,
      day: inputDay,
      hour: inputHour,
    })
  }

  const mapRoofSegmentPins = inputShowPanelCounts && building && solarConfigs
    ? solarConfigs[solarConfigIdx].roofSegmentSummaries
      .map((segment, i) => {
        const idx = segment.segmentIndex ?? 0
        const viewer = mapRef?.current?.cesiumElement!
        const roof = building.solarPotential.roofSegmentStats[idx]
        const pinBuilder = new Cesium.PinBuilder()
        const height = viewer.scene.sampleHeight(Cesium.Cartographic.fromDegrees(roof.center.longitude, roof.center.latitude))
        const color = colors[idx % colors.length]
        return <Entity
          key={i}
          position={Cesium.Cartesian3.fromDegrees(roof.center.longitude, roof.center.latitude, height)}
          billboard={{
            image: pinBuilder.fromText(segment.panelsCount.toString(), Cesium.Color.fromCssColorString(color), 50).toDataURL(),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          }}
        />
      })
    : null

  const mapSolarPanelEntities = inputShowPanels && solarPanels && solarConfigs
    ? solarPanels.slice(0, solarConfigs[solarConfigIdx].panelsCount)
      .map((panel, i) =>
        <Entity key={i} position={panel.position} orientation={panel.rotation}>
          <BoxGraphics
            dimensions={new Cesium.Cartesian3(panel.width, panel.height, 0.2)}
            material={Cesium.Color.fromCssColorString(colors[panel.roofIdx % colors.length]).withAlpha(0.8)}
            outline={true}
            outlineColor={Cesium.Color.BLACK}
          />
        </Entity>
      )
    : null

  const mapDataLayerEntity = layer
    ? <Entity
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

  function playAnimation(onTick: (seconds: number) => void) {
    const viewer = mapRef?.current?.cesiumElement!
    stopAnimation()
    const unsubscribe = viewer.clock.onTick.addEventListener(clock =>
      onTick(Math.floor(Date.now() / 1000))
    )
    setRemoveLayerAnimation(() => unsubscribe)
    setInputAnimation(true)
  }

  function stopAnimation() {
    if (removeLayerAnimation) {
      removeLayerAnimation()
    }
    setInputAnimation(false)
  }

  useEffect(() => {
    if (!inputAnimation) {
      return stopAnimation()
    }
    switch (inputDataLayer) {
      case 'monthlyFlux':
        playAnimation(seconds => setInputMonth(seconds % 12))
        break
      case 'hourlyShade':
        playAnimation(seconds => setInputHour(seconds % 24))
        break
      default:
        stopAnimation()
    }
  }, [inputDataLayer, inputAnimation])

  const dataLayerChoice = building
    ? <Paper elevation={2}>
      <Box p={2}>
        <DataLayerChoice
          layerId={inputDataLayer}
          layer={layer}
          month={{ get: inputMonth, set: setInputMonth }}
          day={{ get: inputDay, set: setInputDay }}
          hour={{ get: inputHour, set: setInputHour }}
          mask={{ get: inputMask, set: setInputMask }}
          animation={{ get: inputAnimation, set: setInputAnimation }}
          onChange={layerId => {
            setErrorLayer(null)
            if (inputDataLayer != layerId) {
              setLayer(null)
              setInputDataLayer(layerId)
              showDataLayer(building, layerId)
              const defaultSettings: Record<LayerId, () => void> = {
                mask: () => {
                  setInputAnimation(false)
                  setInputMask(false)
                },
                dsm: () => {
                  setInputAnimation(false)
                  setInputMask(false)
                },
                rgb: () => {
                  setInputAnimation(false)
                  setInputMask(false)
                },
                annualFlux: () => {
                  setInputAnimation(false)
                  setInputMask(true)
                },
                monthlyFlux: () => {
                  setInputAnimation(true)
                  setInputMask(true)
                  setInputMonth(0)
                },
                hourlyShade: () => {
                  setInputAnimation(true)
                  setInputMask(true)
                  setInputMonth(3)
                  setInputDay(14)
                  setInputHour(5)
                },
              }
              defaultSettings[layerId]()
            }
          }}
          error={errorLayer}
        />
      </Box>
    </Paper>
    : <Skeleton variant='rounded' height={120} />

  const paletteLegend = inputDataLayer != 'rgb' && layerChoice && layer
    ? <Palette
      colors={layerChoice.palette}
      min={layerChoice.min(layer)}
      max={layerChoice.max(layer)}
    />
    : null

  const solarConfigurationSummary = solarConfigs && solarConfigs
    ? <Paper>
      <Box p={2}>
        <Typography variant='subtitle1'>☀️ Solar configuration</Typography>
        <Show sortObjectKeys={false} data={{
          'Monthly energy':
            <Stack direction='row' pt={3} spacing={1}>
              <Slider
                value={Math.round(solarConfigs[solarConfigIdx].yearlyEnergyDcKwh / 12)}
                min={Math.floor(solarConfigs[0].yearlyEnergyDcKwh / 12)}
                max={Math.floor(solarConfigs[solarConfigs.length - 1].yearlyEnergyDcKwh / 12)}
                valueLabelDisplay="on"
                onChange={(_, monthlyKwh) => setInputMonthlyKwh(monthlyKwh as number)}
                sx={{ width: 140 }}
              />
              <Typography>KWh</Typography>
            </Stack>,
          'Config ID': solarConfigIdx,
          'Total panels': `${solarConfigs[solarConfigIdx].panelsCount} panels`,
        }} />
        <FormControlLabel
          control={<Switch
            checked={inputShowPanels}
            onChange={(_, checked) => setInputShowPanels(checked)}
          />}
          label="Show panels"
        />
        <FormControlLabel
          control={<Switch
            checked={inputShowPanelCounts}
            onChange={(_, checked) => setInputShowPanelCounts(checked)}
          />}
          label="Display number of panels"
        />
      </Box >
    </Paper>
    : <Skeleton variant='rounded' height={160} />

  const buildingInsightsSummary = building
    ? <Paper elevation={2}>
      <Box p={2}>
        <Typography variant='subtitle1'>🏡 Building insights</Typography>
        <Show sortObjectKeys={false} data={{
          'Carbon offset factor': `${building.solarPotential.carbonOffsetFactorKgPerMwh.toFixed(1)} Kg/MWh`,
          'Maximum sunshine': `${building.solarPotential.maxSunshineHoursPerYear.toFixed(1)} hr/year`,
          'Maximum panels': `${building.solarPotential.solarPanels.length} panels`,
          'Imagery date': building.imageryDate,
        }} />
      </Box>
    </Paper>
    : <Skeleton variant='rounded' height={200} />

  const solarConfigurationDetails = building && solarConfigs
    ? <>
      <Button
        onClick={() => setOpenMoreDetails(true)}
        variant="contained">
        More details
      </Button>
      <Dialog
        open={openMoreDetails}
        maxWidth='xl'
        onClose={() => setOpenMoreDetails(false)}
      >
        <DialogTitle>
          ☀️ Solar configuration details <br />
          <Typography variant='caption'>Configuration ID: {solarConfigIdx}</Typography>
        </DialogTitle>
        <DialogContent dividers={true}>
          <Paper elevation={2}>
            <Box p={2}>
              <Typography variant='subtitle2'>Configuration</Typography>
              <Show sortObjectKeys={false} data={{
                'Monthly energy':
                  <Stack direction='row' pt={3} spacing={1}>
                    <Slider
                      value={Math.round(solarConfigs[solarConfigIdx].yearlyEnergyDcKwh / 12)}
                      min={Math.floor(solarConfigs[0].yearlyEnergyDcKwh / 12)}
                      max={Math.floor(solarConfigs[solarConfigs.length - 1].yearlyEnergyDcKwh / 12)}
                      valueLabelDisplay="on"
                      onChange={(_, monthlyKwh) => setInputMonthlyKwh(monthlyKwh as number)}
                      sx={{ width: 140 }}
                    />
                    <Typography>KWh</Typography>
                  </Stack>,
                'Config ID': solarConfigIdx,
                'Possible configs': solarConfigs.length,
                'Solar panels used': `${solarConfigs[solarConfigIdx].panelsCount} out of ${building.solarPotential.solarPanels.length}`,
              }} />
            </Box>
          </Paper>
          <Typography pt={4} variant='subtitle2'>
            Building insights response
          </Typography>
          <SolarDetails
            building={building}
            solarConfigIdx={solarConfigIdx}
            colors={colors}
          />
          {dataLayersResponse
            ? <>
              <Typography pt={4} variant='subtitle2'>
                Data layers response
              </Typography>
              <Show data={dataLayersResponse} />
            </>
            : <Grid container justifyContent='center' pt={4}>
              <Typography variant='overline'>Data layers not available</Typography>
            </Grid>
          }
          <Grid container justifyContent='center' pt={2}>
            <Button onClick={() => setOpenMoreDetails(false)}>Close</Button>
          </Grid>
        </DialogContent>
      </Dialog>
    </>
    : <Skeleton variant='rounded' width={130} height={35} />

  return <Box sx={{ display: 'flex' }}>
    <CssBaseline />

    <Box component="main" sx={{ flexGrow: 1 }}>
      <Map
        ref={mapRef}
        cesiumApiKey={cesiumApiKey}
        googleMapsApiKey={googleMapsApiKey}
        onDoubleClick={showSolarPotential}
        onMouseDown={_ => {
          const viewer = mapRef?.current?.cesiumElement!
          // Unlock the camera.
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
          // Remove the orbit listener.
          removeOrbit()
        }}
      >
        {mapRoofSegmentPins}
        {mapSolarPanelEntities}
        {mapDataLayerEntity}
      </Map>
    </Box>

    <Box pl={2} pt={4} pb={20} sx={{ position: 'absolute', height: '100%' }}>
      {paletteLegend}
    </Box>

    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: sidebarWidth,
          boxSizing: 'border-box'
        },
      }}
    >
      <Box p={1} sx={{ overflow: 'auto' }}>
        <SearchBar
          googleMapsApiKey={googleMapsApiKey}
          initialAddress='921 West San Gabriel Avenue, Fresno, CA'
          // initialAddress='7312 West Green Lake Dr N, Seattle, WA 98103'
          onPlaceChanged={async place => showSolarPotential(place.center)}
        />

        {!errorBuilding
          ? <>
            <Box pt={2}>{dataLayerChoice}</Box>
            <Box pt={2}>{solarConfigurationSummary}</Box>
            <Box pt={2}>{buildingInsightsSummary}</Box>

            <Grid p={3} container justifyContent="flex-end">
              {solarConfigurationDetails}
            </Grid>
          </>
          : <Grid container justifyContent='center' pt={10}>
            <Typography variant='overline'>No information to display</Typography>
          </Grid>
        }
      </Box>
    </Drawer >
  </Box >
}
