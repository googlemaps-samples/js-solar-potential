import { useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { Entity } from 'resium';

import CssBaseline from '@mui/material/CssBaseline';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  FormControlLabel,
  Grid,
  Paper,
  Skeleton,
  Slider,
  Stack,
  Switch,
} from '@mui/material';

import { degreesToMeters, solarPanelPolygon } from './utils';

import Map from './components/Map';
import SearchBar from './components/SearchBar';
import Show from './components/Show';

import { BuildingInsightsResponse, findClosestBuilding } from './services/solar/buildingInsights';
import { DataLayer, LayerId, downloadLayer, getDataLayers, layerChoices } from './services/solar/dataLayers';
import { Typography } from '@mui/material';
import DataLayerChoice from './components/DataLayerChoice';
import { Loader } from '@googlemaps/js-api-loader';
import { LatLng } from './common';
import SolarDetails from './components/SolarDetails';

const cesiumApiKey = import.meta.env.VITE_CESIUM_API_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const sidebarWidth = 400

// https://materialui.co/colors
const colors = [
  '#E53935',  // 600 Red
  '#1E88E5',  // 600 Blue
  '#43A047',  // 600 Green
  '#FB8C00',  // 600 Orange
  '#8E24AA',  // 600 Purple
  '#FDD835',  // 600 Yellow
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

  // Information to display in the UI.
  const [building, setBuildingInsights] = useState<BuildingInsightsResponse | null>(null)
  const [layer, setLayer] = useState<DataLayer | null>(null)
  const [removeOrbit, setRemoveOrbit] = useState<any>(() => { })
  const [error, setError] = useState<any>(null)

  // Inputs from the UI.
  const [inputMonthlyKwh, setInputMonthlyKwh] = useState<number>(1000)
  const [inputDataLayer, setInputDataLayer] = useState<LayerId>('monthlyFlux')
  const [inputMonth, setInputMonth] = useState<number>(3)
  const [inputDay, setInputDay] = useState<number>(14)
  const [inputHour, setInputHour] = useState<number>(15)
  const [inputMask, setInputMask] = useState<boolean>(true)
  const [inputShowPanelCounts, setInputShowPanelCounts] = useState<boolean>(false)

  const [openPanelsInfo, setOpenPanelsInfo] = useState(false);

  const googleMapsLoader = new Loader({ apiKey: googleMapsApiKey })
  const elevationLoader = googleMapsLoader
    .importLibrary('core')
    .then(() => new google.maps.ElevationService())

  const solarConfigs = building?.solarPotential?.solarPanelConfigs
  const solarConfigIdx = solarConfigs?.findIndex(config => config.yearlyEnergyDcKwh >= inputMonthlyKwh * 12) ?? 0

  async function showSolarPotential(point: LatLng) {
    setBuildingInsights(null)
    setLayer(null)
    setError(null)

    const buildingPromise = findClosestBuilding(point, googleMapsApiKey)
    const elevationPromise = elevationLoader
      .then(service => service.getElevationForLocations({
        locations: [{ lat: point.latitude, lng: point.longitude }]
      }))

    const building = await buildingPromise
    if ('error' in building) {
      console.error(building.error)
      return setError(building.error)
    }
    setBuildingInsights(building)

    const viewer = mapRef?.current?.cesiumElement!
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
          function orbit(_) {
            viewer.scene.camera.rotateRight(-0.0002)
          }
          try {
            removeOrbit()
          } catch (e) { }
          const unsubscribe = viewer.clock.onTick.addEventListener(orbit)
          setRemoveOrbit(() => unsubscribe)
        }
      }
    )

    showDataLayer(building, inputDataLayer)
  }

  async function showDataLayer(building: BuildingInsightsResponse, layerId: LayerId) {
    const sizeMeters = Math.ceil(degreesToMeters(Math.max(
      building.boundingBox.ne.latitude - building.boundingBox.sw.latitude,
      building.boundingBox.ne.longitude - building.boundingBox.sw.longitude,
    )))
    const response = await getDataLayers(building.center, sizeMeters / 2, googleMapsApiKey)
    if ('error' in response) {
      console.error(response.error)
      return setError(response.error)
    }
    setLayer(await downloadLayer({
      response: response,
      layerId: layerId,
      sizeMeters: sizeMeters,
      center: building.center,
      googleMapsApiKey: googleMapsApiKey,
    }))
  }

  function renderDataLayer(layer: DataLayer): HTMLCanvasElement {
    return layerChoices[inputDataLayer].render({
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
        const viewer = mapRef?.current?.cesiumElement!
        const roof = building.solarPotential.roofSegmentStats[segment.segmentIndex ?? 0]
        const pinBuilder = new Cesium.PinBuilder()
        const height = viewer.scene.sampleHeight(Cesium.Cartographic.fromDegrees(roof.center.longitude, roof.center.latitude))
        const color = colors[i % colors.length]
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

  const mapSolarPanelEntities = building && solarConfigs
    ? building.solarPotential.solarPanels
      .slice(0, solarConfigs[solarConfigIdx].panelsCount)
      .map((panel, i) => {
        const roofSegment = building.solarPotential.roofSegmentStats[panel.segmentIndex ?? 0]
        return <Entity
          key={i}
          polyline={{
            positions: solarPanelPolygon(
              panel,
              building.solarPotential.panelWidthMeters,
              building.solarPotential.panelHeightMeters,
              roofSegment.azimuthDegrees ?? 0,
            ),
            clampToGround: true,
            material: Cesium.Color.BLUE,
            width: 4,
            zIndex: 1,
          }}
        />
      })
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
          onChange={layerId => {
            if (!error && inputDataLayer != layerId) {
              setLayer(null)
              setInputDataLayer(layerId)
              showDataLayer(building, layerId)
            }
          }}
        />
      </Box>
    </Paper>
    : <Skeleton variant='rounded' height={120} />

  const solarConfigurationSummary = solarConfigs && solarConfigs
    ? <Paper>
      <Box p={2}>
        <Typography variant='subtitle1'>Solar configuration</Typography>
        <Show data={{
          'Config number': `${solarConfigIdx} (out of ${solarConfigs.length})`,
          'Monthly energy':
            <Stack direction='row' pt={3} spacing={1}>
              <Slider
                value={Math.round(solarConfigs[solarConfigIdx].yearlyEnergyDcKwh / 12)}
                min={Math.floor(solarConfigs[0].yearlyEnergyDcKwh / 12)}
                max={Math.floor(solarConfigs[solarConfigs.length - 1].yearlyEnergyDcKwh / 12)}
                valueLabelDisplay="on"
                onChange={(_, monthlyKwh) => setInputMonthlyKwh(monthlyKwh as number)}
                sx={{ width: 140 }}
              />,
              <Typography>KWh</Typography>
            </Stack>,
          'Panels count': `${solarConfigs[solarConfigIdx].panelsCount} panels`,
        }} />
        <FormControlLabel
          control={<Switch
            value={inputShowPanelCounts}
            onChange={(_, checked) => setInputShowPanelCounts(checked)}
          />}
          label="Show number of panels"
        />
      </Box >
    </Paper>
    : <Skeleton variant='rounded' height={160} />

  const buildingInsightsSummary = building
    ? <Paper elevation={2}>
      <Box p={2}>
        <Typography variant='subtitle1'>Building insights</Typography>
        <Show data={{
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
        onClick={() => setOpenPanelsInfo(true)}
        variant="contained">
        More details
      </Button>
      <Dialog
        open={openPanelsInfo}
        maxWidth='xl'
        onClose={() => setOpenPanelsInfo(false)}
      >
        <DialogTitle>
          ☀️ Solar configuration details
        </DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText pb={2}>
            <b>Solar configuration number</b>: {solarConfigIdx}<br />
            <b>Number of panels</b>: {solarConfigs[solarConfigIdx].panelsCount} panels<br />
            <b>Yearly energy (DC)</b>: {solarConfigs[solarConfigIdx].yearlyEnergyDcKwh.toFixed(1)} KWh<br />
          </DialogContentText>
          <SolarDetails
            building={building}
            solarConfigIdx={solarConfigIdx}
            colors={colors}
          />
          <Grid container justifyContent='center' pt={2}>
            <Button onClick={() => setOpenPanelsInfo(false)}>Close</Button>
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
          onPlaceChanged={async place => showSolarPotential(place.center)}
        />

        {error
          ? <Grid container justifyContent='center' pt={10}>
            <Typography variant='overline'>No information to display</Typography>
          </Grid>
          : <>
            <Box pt={2}>{dataLayerChoice}</Box>
            <Box pt={2}>{solarConfigurationSummary}</Box>
            <Box pt={2}>{buildingInsightsSummary}</Box>

            <Grid p={3} container justifyContent="flex-end">
              {solarConfigurationDetails}
            </Grid>
          </>
        }
      </Box>
    </Drawer >
  </Box >
}
