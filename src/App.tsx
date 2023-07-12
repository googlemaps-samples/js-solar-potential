import { useEffect, useRef, useState } from 'react'
import ReactDOMServer from 'react-dom/server'
import * as Cesium from 'cesium'
import { Entity, BoxGraphics, RectangleGraphics } from 'resium'

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

import { boundingBoxSize } from './utils'

import Map from './components/Map'
import SearchBar from './components/SearchBar'
import Show from './components/Show'

import { BuildingInsightsResponse, findClosestBuilding } from './services/solar/buildingInsights'
import { DataLayer, DataLayersResponse, LayerId, downloadLayer, getDataLayers, layerChoices, renderImage as renderImageRGB, renderImagePalette } from './services/solar/dataLayers'
import { Typography } from '@mui/material'
import DataLayerChoice from './components/DataLayerChoice'
import { LatLng } from './common'
import SolarDetails from './components/SolarDetails'
import Palette from './components/Palette'

const cesiumApiKey = import.meta.env.VITE_CESIUM_API_KEY
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const sidebarWidth = 400

/* TODO:
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
  const [solarPanels, setSolarPanels] = useState<JSX.Element[]>([])
  const [layerImages, setLayerImages] = useState<HTMLCanvasElement[]>([])

  // Inputs from the UI.
  const [inputMonthlyKwh, setInputMonthlyKwh] = useState<number>(1000)
  const [inputLayerId, setInputDataLayer] = useState<LayerId>('monthlyFlux')
  const [inputMonth, setInputMonth] = useState<number>(0)
  const [inputDay, setInputDay] = useState<number>(0)
  const [inputHour, setInputHour] = useState<number>(0)
  const [inputMask, setInputMask] = useState<boolean>(true)
  const [inputAnimation, setInputAnimation] = useState<boolean>(true)
  const [inputShowPanels, setInputShowPanels] = useState<boolean>(true)
  const [inputShowPanelCounts, setInputShowPanelCounts] = useState<boolean>(false)

  const solarConfigs = building?.solarPotential?.solarPanelConfigs
  const solarConfigMaybeIdx = solarConfigs
    ? solarConfigs.findIndex(config => config.yearlyEnergyDcKwh >= inputMonthlyKwh * 12)
    : 0
  const solarConfigIdx = solarConfigs && solarConfigMaybeIdx < 0
    ? solarConfigs.length - 1
    : solarConfigMaybeIdx

  async function showSolarPotential(point: LatLng) {
    setBuildingInsights(null)
    setLayer(null)
    setSolarPanels([])
    setLayerImages([])
    setErrorLayer(null)
    setErrorBuilding(null)

    const buildingPromise = findClosestBuilding(point, googleMapsApiKey)
    const building = await buildingPromise
    if ('error' in building) {
      console.error(building.error)
      return setErrorBuilding(building.error)
    }
    setBuildingInsights(building)

    const viewer = mapRef?.current?.cesiumElement!
    const buildingPosition = Cesium.Cartesian3.fromDegrees(building.center.longitude, building.center.latitude)
    const location = (await viewer.scene.clampToHeightMostDetailed([buildingPosition]))[0]
    const range = boundingBoxSize(building.boundingBox) * 2
    const offset = new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-30), range)
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    if (removeOrbit) {
      removeOrbit()
    }
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
          const unsubscribe = viewer.clock.onTick.addEventListener(() =>
            viewer.camera.rotateRight(-0.0002)
          )
          setRemoveOrbit(() => unsubscribe)
        }
      }
    )

    const maxYearlyPotential = building.solarPotential.solarPanelConfigs.slice(-1)[0].yearlyEnergyDcKwh
    setInputMonthlyKwh(maxYearlyPotential / 12 * 0.8)

    const panelPositions = building.solarPotential.solarPanels
      .map(panel => Cesium.Cartesian3.fromDegrees(panel.center.longitude, panel.center.latitude))

    const clampedPositions = await viewer.scene.clampToHeightMostDetailed(panelPositions, [], building.solarPotential.panelWidthMeters)
    setSolarPanels(building.solarPotential.solarPanels.map((panel, i) => {
      const roofIdx = panel.segmentIndex ?? 0
      const roof = building.solarPotential.roofSegmentStats[roofIdx]
      const position = clampedPositions[i]
      const [width, height] = panel.orientation == 'LANDSCAPE'
        ? [building.solarPotential.panelWidthMeters, building.solarPotential.panelHeightMeters]
        : [building.solarPotential.panelHeightMeters, building.solarPotential.panelWidthMeters]
      const azimuth = roof.azimuthDegrees ?? 0
      const pitch = roof.pitchDegrees ?? 0
      const color = colors[roofIdx % colors.length]
      const panelInfo = building.solarPotential.solarPanels[i]
      const roofInfo = building.solarPotential.roofSegmentStats[roofIdx]
      return <Entity key={i}
        name={`Solar panel ${i}`}
        description={ReactDOMServer.renderToStaticMarkup(
          <table className="cesium-infoBox-defaultTable">
            <tr>
              <td>Latitude</td>
              <td>{panelInfo.center.latitude.toFixed(7)}</td>
            </tr>
            <tr>
              <td>Longitude</td>
              <td>{panelInfo.center.longitude.toFixed(7)}</td>
            </tr>
            <tr>
              <td>Orientation</td>
              <td>{panelInfo.orientation}</td>
            </tr>
            <tr>
              <td>Yearly energy</td>
              <td>{panelInfo.yearlyEnergyDcKwh.toFixed(1)} DC KWh</td>
            </tr>
            <tr>
              <td>Roof segment</td>
              <td>
                <span style={{ color: color }}>█ &nbsp;</span>
                <span>{panelInfo.segmentIndex ?? 0}</span>
              </td>
            </tr>
            <tr>
              <td>Pitch</td>
              <td>{roofInfo?.pitchDegrees?.toFixed(1) ?? 0}°</td>
            </tr>
            <tr>
              <td>Azimuth</td>
              <td>{roofInfo?.azimuthDegrees?.toFixed(1) ?? 0}°</td>
            </tr>
          </table>
        )}
        position={position}
        orientation={Cesium.Transforms.headingPitchRollQuaternion(
          position,
          Cesium.HeadingPitchRoll.fromDegrees(azimuth + 90, pitch, 0)
        )}
        height={1}
      >
        <BoxGraphics
          dimensions={new Cesium.Cartesian3(width, height, 1)}
          material={Cesium.Color.fromCssColorString(color).withAlpha(0.8)}
          outline={true}
          outlineColor={Cesium.Color.BLACK}
        />
      </Entity>
    }))

    showDataLayer(building, inputLayerId)
  }

  async function showDataLayer(building: BuildingInsightsResponse, inputLayerId: LayerId) {
    if (!inputLayerId) {
      return
    }

    const sizeMeters = boundingBoxSize(building.boundingBox)
    const response = await getDataLayers(building.center, sizeMeters / 2, googleMapsApiKey)
    if ('error' in response) {
      console.error(response.error)
      setDataLayersResponse(null)
      return setErrorLayer(response.error)
    }
    setDataLayersResponse(response)
    const layer = await downloadLayer({
      response: response,
      layerId: inputLayerId,
      sizeMeters: sizeMeters,
      center: building.center,
      googleMapsApiKey: googleMapsApiKey,
    })

    switch (inputLayerId) {
      case 'monthlyFlux':
        setLayerImages(Array(12).fill(0).map((_, inputMonth) =>
          renderLayerImage(layer, inputMonth, inputDay, inputHour)
        ))
        break
      case 'hourlyShade':
        setLayerImages(Array(24).fill(0).map((_, inputHour) =>
          renderLayerImage(layer, inputMonth, inputDay, inputHour)
        ))
        break
      default:
        setLayerImages([renderLayerImage(layer, inputMonth, inputDay, inputHour)])
    }
    setLayer(layer)
  }

  function renderLayerImage(layer: DataLayer, inputMonth: number, inputDay: number, inputHour: number) {
    const mask = inputMask
      ? layer.mask
      : { ...layer.mask, rasters: [layer.mask.rasters[0].map((_: any) => 1)] }

    console.log('Render', layer, { month: inputMonth, day: inputDay, hour: inputHour })

    const choice = layerChoices[layer.id]
    const render: Record<LayerId, () => HTMLCanvasElement> = {
      mask: () => renderImagePalette({
        data: layer.images[0],
        mask: mask,
        palette: choice.palette,
        min: choice.min(layer),
        max: choice.max(layer),
      }),
      dsm: () => renderImagePalette({
        data: layer.images[0],
        mask: mask,
        palette: choice.palette,
        min: choice.min(layer),
        max: choice.max(layer),
      }),
      rgb: () => renderImageRGB({
        rgb: layer.images[0],
        mask: mask,
      }),
      annualFlux: () => renderImagePalette({
        data: layer.images[0],
        mask: mask,
        palette: choice.palette,
        min: choice.min(layer),
        max: choice.max(layer),
      }),
      monthlyFlux: () => renderImagePalette({
        data: {
          ...layer.images[0],
          rasters: [layer.images[0].rasters[inputMonth]],
        },
        mask: mask,
        palette: choice.palette,
        min: choice.min(layer),
        max: choice.max(layer),
      }),
      hourlyShade: () => renderImagePalette({
        data: {
          ...layer.images[inputMonth],
          rasters: [
            layer.images[inputMonth].rasters[inputHour]
              .map((x: number) => x & (1 << (inputDay - 1))),
          ],
        },
        mask: mask,
        palette: choice.palette,
        min: choice.min(layer),
        max: choice.max(layer),
      }),
    }
    return render[layer.id]()
  }

  const getLayerImage: Record<LayerId, HTMLCanvasElement> = {
    mask: layerImages[0],
    dsm: layerImages[0],
    rgb: layerImages[0],
    annualFlux: layerImages[0],
    monthlyFlux: layerImages[inputMonth],
    hourlyShade: layerImages[inputHour],
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
        return <Entity key={i}
          name={`Roof segment ${i}`}
          position={Cesium.Cartesian3.fromDegrees(roof.center.longitude, roof.center.latitude, height)}
          billboard={{
            image: pinBuilder.fromText(segment.panelsCount.toString(), Cesium.Color.fromCssColorString(color), 50).toDataURL(),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          }}
        />
      })
    : null

  const mapDataLayerEntity = <Entity
    name={inputLayerId}
    description={ReactDOMServer.renderToStaticMarkup(
      <table className="cesium-infoBox-defaultTable">
        <tr>
          <td>Latitude</td>
          <td>{building?.center.latitude.toFixed(7)}</td>
        </tr>
        <tr>
          <td>Longitude</td>
          <td>{building?.center.longitude.toFixed(7)}</td>
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
      coordinates={layer
        ? Cesium.Rectangle.fromDegrees(
          layer.west, layer.south,
          layer.east, layer.north,
        )
        : undefined
      }
      material={new Cesium.ImageMaterialProperty({
        image: getLayerImage[inputLayerId],
        transparent: true,
      })}
    />
  </Entity>

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
    if (layer && inputLayerId == 'hourlyShade') {
      setLayerImages(Array(24).fill(0).map((_, inputHour) =>
        renderLayerImage(layer, inputMonth, inputDay, inputHour)
      ))
    }
  }, [layer, inputMonth, inputDay])

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

  const dataLayerChoice = building
    ? <Paper elevation={2}>
      <Box p={2}>
        <DataLayerChoice
          layerId={inputLayerId}
          layer={layer}
          month={{ get: inputMonth, set: setInputMonth }}
          day={{ get: inputDay, set: setInputDay }}
          hour={{ get: inputHour, set: setInputHour }}
          mask={{ get: inputMask, set: setInputMask }}
          animation={{ get: inputAnimation, set: setInputAnimation }}
          onChange={inputLayerId => {
            setErrorLayer(null)
            setLayer(null)
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
            showDataLayer(building, inputLayerId)
          }}
          error={errorLayer}
        />
      </Box>
    </Paper>
    : <Skeleton variant='rounded' height={120} />

  const paletteLegend = inputLayerId != 'rgb' && layer
    ? <Palette
      colors={layerChoices[inputLayerId].palette}
      min={layerChoices[inputLayerId].min(layer)}
      max={layerChoices[inputLayerId].max(layer)}
    />
    : null

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
                      max={Math.floor(solarConfigs.slice(-1)[0].yearlyEnergyDcKwh / 12)}
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
        {solarPanels}
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
          initialAddress='Google MP2, Borregas Avenue, Sunnyvale, CA'
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
