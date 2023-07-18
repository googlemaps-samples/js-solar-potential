import { useEffect, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'
import * as Cesium from 'cesium'
import { Entity, BoxGraphics, RectangleGraphics } from 'resium'

import CssBaseline from '@mui/material/CssBaseline'
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  Paper,
  Skeleton,
  Slider,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import GitHubIcon from '@mui/icons-material/GitHub'
import LaunchIcon from '@mui/icons-material/Launch'

import { DataLayer, SolarPanelEntity, boundingBoxSize, createRoofPins, createSolarPanels, flyTo, normalize, normalizeArray, renderDataLayer } from './utils'

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

// TODO: 
// - Refactor Maps APIs into services

const cesiumApiKey = import.meta.env.VITE_CESIUM_API_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const googleOffices = {
  'Googleplex': 'Googleplex, Amphitheatre Parkway, Mountain View, California',
  'Moffet Place': 'Google MP2, Borregas Avenue, Sunnyvale, CA',
  'Seattle': 'Google Seattle Lakeside, North 34th Street, Seattle, WA',
  'Boulder': 'Google Boulder, Pearl Street, Suite 110, Boulder, CO',
  'Chicago': 'Google Chicago Fulton Market, North Morgan Street, Chicago, IL',
  'Kirkland': 'Google Kirkland Urban Central, Urban Plaza, Kirkland, WA',
  'New York City': 'Google NYC: 8510 Building, 10th Avenue, New York, NY',
  'San Francisco': 'Google San Francisco, Spear Street, San Francisco, CA',
}

const sidebarWidth = 400

// https://materialui.co/colors
const roofColors = [
  '#E57373',  // Red
  '#7986CB',  // Indigo
  '#A3E1CB',  // Cyan / light blue
  '#FDA679',  // Orange
  '#96C9EB',  // Blue
  '#FECBC8',  // Pale pink
  '#C0C3F9',  // Lavender
  '#0D979C',  // Teal
  '#56ada0',  // Light teal
  '#0676A8',  // Teal / blue
  '#3F63CE',  // Dark blue
  '#FF772B',  // Orange
  '#699914',  // Green
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
  const [inputShowDataLayer, setInputShowDataLayer] = useState(true)
  const [inputAddress, setInputAddress] = useState('')

  // App state.
  const [openMoreDetails, setOpenMoreDetails] = useState(false)
  const [buildingResponse, setBuildingResponse] = useState<BuildingInsightsResponse | null>(null)
  const [dataLayersResponse, setDataLayersResponse] = useState<DataLayersResponse | null>(null)
  const [errorBuilding, setErrorBuilding] = useState<any>()
  const [errorLayer, setErrorLayer] = useState<any>()

  // Map entities cache since they're expensive to create.
  const [solarPanels, setSolarPanels] = useState<SolarPanelEntity[]>([])
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
      cameraAngle: Cesium.Math.toRadians(-23),
      cameraDistance: 150,
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
      panelDepth: 0.5,
      info: (panel, roof, roofIdx) => ({
        'Latitude': panel.center.latitude.toFixed(7),
        'Longitude': panel.center.latitude.toFixed(7),
        'Orientation': panel.orientation,
        'Yearly energy': `${panel.yearlyEnergyDcKwh} DC KWh`,
        'Roof segment': <>
          <span style={{ color: roofColors[roofIdx % roofColors.length] }}>█ &nbsp;</span>
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

  const mapRoofPins = inputShowPanelCounts && buildingResponse && solarConfigs
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

  const solarConfigurationSummary = solarConfigs
    ? <Paper>
      <Box p={2}>
        <Typography variant='subtitle1'>☀️ Solar configuration</Typography>
        <Box pt={1} />
        <Typography variant='body2' fontSize='small' fontStyle={{ color: '#616161' }}>
          The Solar API gives us an array of many possible combinations of solar panel configurations.
          Based on your yearly energy requirements, you can choose your desired configuration.
          The roof is broken into segments, and each has a different color.
        </Typography>
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
          'Possible configs': solarConfigs.length,
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
    : <Skeleton variant='rounded' height={300} />

  const dataLayerChoice = buildingResponse
    ? <Paper elevation={2}>
      <Box p={2}>
        <Typography variant='subtitle1'>🗺️ Data layer</Typography>
        <Stack pt={2}>
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
          {dataLayer
            ? <FormControlLabel
              control={<Switch
                checked={inputShowDataLayer}
                onChange={(_, checked) => setInputShowDataLayer(checked)}
              />}
              label="Show data layer"
            />
            : null
          }
        </Stack>
      </Box>
    </Paper>
    : <Skeleton variant='rounded' height={160} />

  const paletteLegend = inputShowDataLayer && dataLayer && dataLayer.palette
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

  const initialAddress = Object.keys(googleOffices)[0]
  useEffect(() => {
    setInputAddress(googleOffices[initialAddress])
  }, [])

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
        {mapRoofPins}
        {inputShowPanels
          ? solarPanels.slice(0, solarConfigs?.at(solarConfigIdx)?.panelsCount ?? 0)
            .map((panel, i) =>
              <Entity key={i}
                name={panel.name}
                position={panel.position}
                orientation={panel.orientation}
                description={panel.description}
              >
                <BoxGraphics
                  dimensions={panel.dimensions}
                  material={Cesium.Color.fromCssColorString(roofColors[panel.roofIdx % roofColors.length])}
                  outline={true}
                  outlineColor={Cesium.Color.fromCssColorString('#424242')}
                />
              </Entity>
            )
          : null
        }
        {inputShowDataLayer ? mapDataLayerEntity : null}
      </Map>
    </Box>

    <Box p={1} pb={20} sx={{ position: 'absolute' }}>
      <Grid container direction='column' spacing={1}>
        <Grid item>
          <Paper>
            <Box px={2} pb={1}>
              <Autocomplete
                disablePortal
                size='small'
                defaultValue={initialAddress}
                options={Object.keys(googleOffices)}
                sx={{ width: 200 }}
                renderInput={(params) => <TextField {...params} label="Visit a Google office" variant='standard' />}
                onChange={(_, officeName) => {
                  if (officeName) {
                    setInputAddress(googleOffices[officeName])
                  }
                }}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item>
          <Stack direction='row' sx={{ height: '200px' }}>
            <Box sx={{ height: '100%' }}>
              {paletteLegend}
            </Box>
            <Box />
          </Stack>
        </Grid>
      </Grid>
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
        <Stack>
          <Stack direction='row' justifyContent='space-between'>
            <Typography variant='h6'>☀️ Solar API demo</Typography>
            <IconButton
              href='https://github.com/davidcavazos/solar-potential'
              target='_blank'
            >
              <GitHubIcon />
            </IconButton>
          </Stack>

          <SearchBar
            googleMapsApiKey={googleMapsApiKey}
            inputValue={inputAddress}
            setInputValue={setInputAddress}
            onPlaceChanged={async place => showSolarPotential(place.center)}
          />
        </Stack>

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
            <Typography variant='overline'>{errorBuilding.message}</Typography>
          </Grid>
        }
        <Grid container pb={2} justifyContent='center'>
          <Typography variant='body2' fontSize='small' fontStyle={{ color: '#616161' }}>
            This is not an officially supported Google product.
          </Typography>
          <Typography variant='body2' fontSize='small' fontStyle={{ color: '#616161' }}>
            Rendered with &nbsp;
            <Link href="https://cesium.com">
              Cesium
              <LaunchIcon fontSize='small' />
            </Link>
          </Typography>
        </Grid>
      </Box>
    </Drawer >
  </Box >
}
