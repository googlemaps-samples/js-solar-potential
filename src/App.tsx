import { useEffect, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'
import * as Cesium from 'cesium'
import { Entity, RectangleGraphics } from 'resium'

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
  LinearProgress,
  Paper,
  Skeleton,
  Slider,
  Stack,
  Switch,
} from '@mui/material'

import { DataLayer, boundingBoxSize, createRoofPins, createSolarPanels, flyTo, normalize, normalizeArray, renderDataLayer } from './utils'

import Map from './components/Map'
import SearchBar from './components/SearchBar'
import Show from './components/Show'

import { BuildingInsightsResponse, findClosestBuilding } from './services/solar/buildingInsights'
import { DataLayersResponse, LayerId, getDataLayers } from './services/solar/dataLayers'
import { Typography } from '@mui/material'
import DataLayerChoice from './components/DataLayerChoice'
import { LatLng } from './common'
import SolarDetails from './components/SolarDetails'
import Palette from './components/Palette'

const cesiumApiKey = import.meta.env.VITE_CESIUM_API_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const sidebarWidth = 400

// https://materialui.co/colors
const roofColors = [
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

  // Inputs from the UI.
  const [inputLayerId, setInputDataLayer] = useState<LayerId | null>('annualFlux')
  const [inputMonth, setInputMonth] = useState(0)
  const [inputDay, setInputDay] = useState(0)
  const [inputHour, setInputHour] = useState(0)
  const [inputMask, setInputMask] = useState(true)
  const [inputAnimation, setInputAnimation] = useState(true)
  const [inputMonthlyKwh, setInputMonthlyKwh] = useState(0)
  const [inputShowPanelCounts, setInputShowPanelCounts] = useState(false)
  const [inputShowPanels, setInputShowPanels] = useState(true)

  // App state.
  const [openMoreDetails, setOpenMoreDetails] = useState(false)
  const [buildingResponse, setBuildingResponse] = useState<BuildingInsightsResponse | null>(null)
  const [dataLayersResponse, setDataLayersResponse] = useState<DataLayersResponse | null>(null)
  const [errorBuilding, setErrorBuilding] = useState<any>()
  const [errorLayer, setErrorLayer] = useState<any>()

  // Map entities cache since they're expensive to create.
  const [solarPanels, setSolarPanels] = useState<JSX.Element[]>([])
  const [dataLayer, setDataLayer] = useState<DataLayer | null>(null)
  const [loadingLayer, setLoadingLayer] = useState(false)

  // Callbacks to cancel animations.
  const [removeOrbit, setRemoveOrbit] = useState<any>()
  const [removeLayerAnimation, setRemoveLayerAnimation] = useState<any>()

  const solarConfigs = buildingResponse?.solarPotential?.solarPanelConfigs
  const solarConfigMaybeIdx = solarConfigs
    ? solarConfigs.findIndex(config => config.yearlyEnergyDcKwh >= inputMonthlyKwh * 12)
    : 0
  const solarConfigIdx = solarConfigs && solarConfigMaybeIdx < 0
    ? solarConfigs.length - 1
    : solarConfigMaybeIdx

  async function showSolarPotential(point: LatLng) {
    // Clear API responses and errors.
    setBuildingResponse(null)
    setDataLayersResponse(null)
    setErrorBuilding(null)
    setErrorLayer(null)

    // Clear entity caches.
    setSolarPanels([])
    setDataLayer(null)

    // Get the building insights from the Solar API.
    const buildingResponse = await findClosestBuilding(point, googleMapsApiKey)
    if ('error' in buildingResponse) {
      console.error(buildingResponse.error)
      return setErrorBuilding(buildingResponse.error)
    }
    setBuildingResponse(buildingResponse)

    // Set the initial montly KWh to 80% of the building's capacity.
    const maxYearlyPotential = buildingResponse.solarPotential.solarPanelConfigs.slice(-1)[0].yearlyEnergyDcKwh
    setInputMonthlyKwh(maxYearlyPotential / 12 * 0.8)

    // Fly to the location.
    const viewer = mapRef?.current?.cesiumElement!
    flyTo({
      viewer: viewer,
      point: buildingResponse.center,
      cameraAngle: Cesium.Math.toRadians(-25),
      cameraDistance: boundingBoxSize(buildingResponse.boundingBox) * 2,
      onStart: () => {
        // Unlock the camera.
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
        // Remove the orbit animation, if any.
        if (removeOrbit) {
          removeOrbit()
        }
      },
      onEnd: ({ position, offset }) => {
        // Lock the camera onto a point.
        viewer.scene.camera.lookAtTransform(
          Cesium.Transforms.eastNorthUpToFixedFrame(position),
          offset,
        )
        // Start the orbit animation.
        const unsubscribe = viewer.clock.onTick.addEventListener(() =>
          viewer.camera.rotateRight(-0.0002)
        )
        setRemoveOrbit(() => unsubscribe)
      },
    })

    // Create the solar panel entities for the map.
    createSolarPanels({
      viewer: viewer,
      roofSegments: buildingResponse.solarPotential.roofSegmentStats,
      panels: buildingResponse.solarPotential.solarPanels,
      panelWidth: buildingResponse.solarPotential.panelWidthMeters ?? 0,
      panelHeight: buildingResponse.solarPotential.panelHeightMeters ?? 0,
      colors: roofColors,
      info: (panel, roof, color) => ({
        'Latitude': panel.center.latitude.toFixed(7),
        'Longitude': panel.center.latitude.toFixed(7),
        'Orientation': panel.orientation,
        'Yearly energy': `${panel.yearlyEnergyDcKwh} DC KWh`,
        'Roof segment': <>
          <span style={{ color: color }}>█ &nbsp;</span>
          <span>{panel.segmentIndex ?? 0}</span>
        </>,
        'Pitch': `${roof.pitchDegrees}°`,
        'Azimuth': `${roof.azimuthDegrees}°`,
      }),
    }).then(panels => setSolarPanels(panels))

    // Get the data layer URLs from the Solar API.
    const radius = boundingBoxSize(buildingResponse.boundingBox) / 2
    const dataLayersResponse = await getDataLayers(buildingResponse.center, radius, googleMapsApiKey)
    if ('error' in dataLayersResponse) {
      console.error(dataLayersResponse.error)
      return setErrorLayer(dataLayersResponse.error)
    }
    setDataLayersResponse(dataLayersResponse)
  }

  const mapRoofSegmentPins = inputShowPanelCounts && buildingResponse && solarConfigs
    ? createRoofPins({
      viewer: mapRef?.current?.cesiumElement!,
      solarConfig: solarConfigs[solarConfigIdx],
      roofStats: buildingResponse.solarPotential.roofSegmentStats,
      roofColors: roofColors,
    })
    : null

  const layerImageIdx: Record<LayerId, number> = {
    mask: 0,
    dsm: 0,
    rgb: 0,
    annualFlux: 0,
    monthlyFlux: inputMonth,
    hourlyShade: inputHour,
  }

  const mapDataLayerEntity = dataLayer
    ? <Entity
      name={inputLayerId}
      description={ReactDOMServer.renderToStaticMarkup(
        <table className="cesium-infoBox-defaultTable">
          <tr>
            <td>Latitude</td>
            <td>{buildingResponse?.center.latitude.toFixed(7)}</td>
          </tr>
          <tr>
            <td>Longitude</td>
            <td>{buildingResponse?.center.longitude.toFixed(7)}</td>
          </tr>
          <tr>
            <td>Imagery quality</td>
            <td>{dataLayersResponse?.imageryQuality}</td>
          </tr>
          <tr>
            <td>Imagery date</td>
            <td>
              {dataLayersResponse?.imageryDate.month}
              /{dataLayersResponse?.imageryDate.day}
              /{dataLayersResponse?.imageryDate.year}
            </td>
          </tr>
          <tr>
            <td>Imagery processed date</td>
            <td>
              {dataLayersResponse?.imageryProcessedDate.month}
              /{dataLayersResponse?.imageryProcessedDate.day}
              /{dataLayersResponse?.imageryProcessedDate.year}
            </td>
          </tr>
        </table>
      )}
    >
      <RectangleGraphics
        coordinates={Cesium.Rectangle.fromDegrees(
          dataLayer.boundingBox.sw.longitude,
          dataLayer.boundingBox.sw.latitude,
          dataLayer.boundingBox.ne.longitude,
          dataLayer.boundingBox.ne.latitude,
        )}
        material={new Cesium.ImageMaterialProperty({
          image: dataLayer.images[layerImageIdx[dataLayer.id]],
          transparent: true,
        })}
      />
    </Entity>
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
    if (inputLayerId && buildingResponse && dataLayersResponse && !loadingLayer) {
      setLoadingLayer(true)
      renderDataLayer({
        inputLayerId: inputLayerId,
        inputMask: inputMask,
        inputMonth: inputMonth,
        inputDay: inputDay,
        dataLayersResponse: dataLayersResponse,
        dataLayer: dataLayer,
        googleMapsApiKey: googleMapsApiKey,
      }).then(layer => {
        setDataLayer(layer)
        setLoadingLayer(false)
      })
        .catch((error: any) => {
          console.error(error)
          setErrorLayer(error)
        })
    }
  }, [inputLayerId, dataLayersResponse, inputMask, inputMonth, inputDay])

  useEffect(() => {
    if (!inputAnimation) {
      return stopAnimation()
    }
    switch (inputLayerId) {
      case 'monthlyFlux':
        playAnimation(seconds => setInputMonth(seconds % 12))
        break
      case 'hourlyShade':
        playAnimation(seconds => setInputHour(seconds % 24))
        break
      default:
        stopAnimation()
    }
  }, [inputLayerId, inputAnimation])

  const solarConfigurationSummary = solarConfigs
    ? <Paper>
      <Box p={2}>
        <Typography variant='subtitle1'>☀️ Solar configuration</Typography>
        <Show sortObjectKeys={false} data={{
          'Monthly energy':
            <Stack direction='row' pt={3} spacing={1}>
              <Slider
                value={Math.ceil(inputMonthlyKwh)}
                min={Math.floor(solarConfigs[0].yearlyEnergyDcKwh / 12)}
                max={Math.floor(solarConfigs.slice(-1)[0].yearlyEnergyDcKwh / 12)}
                valueLabelDisplay="on"
                onChange={(_, monthlyKwh) => setInputMonthlyKwh(monthlyKwh as number)}
                sx={{ width: 140 }}
              />
              <Typography>KWh</Typography>
            </Stack>,
          'Config ID': solarConfigIdx,
          'Total panels': `${solarConfigs[solarConfigIdx].panelsCount} panels`,
        }} />
        {solarPanels.length > 0
          ? <>
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
          </>
          : <LinearProgress />
        }
      </Box >
    </Paper>
    : <Skeleton variant='rounded' height={160} />

  const dataLayerChoice = buildingResponse
    ? <Paper elevation={2}>
      <Box p={2}>
        <Typography variant='subtitle1'>🗺️ Data layer</Typography>
        <Box pt={2} />
        <DataLayerChoice
          layerId={inputLayerId}
          loading={!dataLayer}
          month={{ get: inputMonth, set: setInputMonth }}
          day={{ get: inputDay, set: setInputDay }}
          hour={{ get: inputHour, set: setInputHour }}
          mask={{ get: inputMask, set: setInputMask }}
          animation={{ get: inputAnimation, set: setInputAnimation }}
          onChange={inputLayerId => {
            setErrorLayer(null)
            setDataLayer(null)
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
              },
              hourlyShade: () => {
                setInputAnimation(true)
                setInputMask(true)
                setInputMonth(3)
                setInputDay(14)
              },
            }
            defaultSettings[inputLayerId]()
            setInputDataLayer(inputLayerId)
          }}
          error={errorLayer}
        />
      </Box>
    </Paper>
    : <Skeleton variant='rounded' height={160} />

  const paletteLegend = dataLayer && dataLayer.palette
    ? <Palette
      colors={dataLayer.palette.colors}
      min={dataLayer.palette.min}
      max={dataLayer.palette.max}
    />
    : null

  const buildingInsightsSummary = buildingResponse
    ? <Paper elevation={2}>
      <Box p={2}>
        <Typography variant='subtitle1'>🏡 Building insights</Typography>
        <Show sortObjectKeys={false} data={{
          'Carbon offset factor': `${buildingResponse.solarPotential.carbonOffsetFactorKgPerMwh?.toFixed(1)} Kg/MWh`,
          'Maximum sunshine': `${buildingResponse.solarPotential.maxSunshineHoursPerYear?.toFixed(1)} hr/year`,
          'Maximum panels': `${buildingResponse.solarPotential.solarPanels.length} panels`,
          'Imagery date': buildingResponse.imageryDate,
        }} />
      </Box>
    </Paper>
    : <Skeleton variant='rounded' height={200} />

  const solarConfigurationDetails = buildingResponse && solarConfigs
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
                      max={Math.floor(solarConfigs.slice(-1)[0].yearlyEnergyDcKwh / 12)}
                      valueLabelDisplay="on"
                      onChange={(_, monthlyKwh) => setInputMonthlyKwh(monthlyKwh as number)}
                      sx={{ width: 140 }}
                    />
                    <Typography>KWh</Typography>
                  </Stack>,
                'Config ID': solarConfigIdx,
                'Possible configs': solarConfigs.length,
                'Solar panels used': `${solarConfigs[solarConfigIdx].panelsCount} out of ${buildingResponse.solarPotential.solarPanels.length}`,
              }} />
            </Box>
          </Paper>
          <Typography pt={4} variant='subtitle2'>
            Building insights response
          </Typography>
          <SolarDetails
            building={buildingResponse}
            solarConfigIdx={solarConfigIdx}
            colors={roofColors}
          />
          {dataLayersResponse
            ? <>
              <Box pt={4} />
              <Paper elevation={2}>
                <Box p={2}>
                  <Typography variant='subtitle2'>
                    Data layers response
                  </Typography>
                  <Show data={dataLayersResponse} />
                </Box>
              </Paper>
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
          // Cancel any fly-to animations.
          viewer.camera.cancelFlight()
          // Unlock the camera.
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
          // Remove the orbit listener.
          if (removeOrbit) {
            removeOrbit()
          }
        }}
      >
        {mapRoofSegmentPins}
        {inputShowPanels
          ? solarPanels.slice(0, solarConfigs?.at(solarConfigIdx)?.panelsCount ?? 0)
          : null
        }
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
      <Box p={1} pt={2} sx={{ overflow: 'auto' }}>
        <SearchBar
          googleMapsApiKey={googleMapsApiKey}
          initialAddress='Google MP2, Borregas Avenue, Sunnyvale, CA'
          onPlaceChanged={async place => showSolarPotential(place.center)}
        />

        {!errorBuilding
          ? <>
            <Box pt={2}>{solarConfigurationSummary}</Box>
            <Box pt={2}>{dataLayerChoice}</Box>
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
