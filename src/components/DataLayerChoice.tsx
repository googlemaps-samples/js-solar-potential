import { Autocomplete, Box, FormControlLabel, Grid, LinearProgress, Slider, Stack, Switch, TextField, Typography } from "@mui/material"
import { DataLayer, LayerId, layerChoices } from "../services/solar/dataLayers"

interface Props {
  layerId: LayerId
  layer: DataLayer | null
  month: { get: number, set: (x: number) => void }
  day: { get: number, set: (x: number) => void }
  hour: { get: number, set: (x: number) => void }
  mask: { get: boolean, set: (x: boolean) => void }
  animation: { get: boolean, set: (x: boolean) => void }
  onChange: (layerId: LayerId) => void
  error?: any
}

export default function DataLayerChoice(props: Props) {
  const monthSlider = <Slider
    value={props.month.get}
    onChange={(_, value) => props.month.set(value as number)}
    track={false}
    min={0}
    max={11}
    marks={[
      { value: 0, label: 'Jan' },
      { value: 1, label: 'Feb' },
      { value: 2, label: 'Mar' },
      { value: 3, label: 'Apr' },
      { value: 4, label: 'May' },
      { value: 5, label: 'Jun' },
      { value: 6, label: 'Jul' },
      { value: 7, label: 'Aug' },
      { value: 8, label: 'Sep' },
      { value: 9, label: 'Oct' },
      { value: 10, label: 'Nov' },
      { value: 11, label: 'Dec' },
    ]} />

  const daySlider = <Slider
    value={props.day.get}
    onChange={(_, value) => props.day.set(value as number)}
    valueLabelDisplay="auto"
    track={false}
    min={1}
    max={[
      31,  // Jan
      28,  // Feb
      31,  // Mar
      30,  // Apr
      31,  // May
      30,  // Jun
      31,  // Jul
      31,  // Aug
      30,  // Sep
      31,  // Oct
      30,  // Nov
      31,  // Dec
    ][props.month.get]}
    marks={[
      { value: 1, label: '1st' },
      { value: 7, label: '7th' },
      { value: 14, label: '14th' },
      { value: 21, label: '21th' },
      { value: 28, label: '28th' },
    ]} />

  const hourSlider = <Slider
    value={props.hour.get}
    onChange={(_, value) => props.hour.set(value as number)}
    valueLabelDisplay="auto"
    track={false}
    min={0}
    max={23}
    marks={[
      { value: 4, label: '4am' },
      { value: 8, label: '8am' },
      { value: 12, label: '12pm' },
      { value: 16, label: '4pm' },
      { value: 20, label: '8pm' },
    ]} />

  const maskSwitch = <FormControlLabel
    control={<Switch
      checked={props.mask.get}
      onChange={(_, checked) => props.mask.set(checked)}
    />}
    label="Show roof only"
  />

  const animationSwitch = <FormControlLabel
    control={<Switch
      checked={props.animation.get}
      onChange={(_, checked) => props.animation.set(checked)}
    />}
    label="Play animation"
  />

  const descriptions: Record<LayerId, string> = {
    mask: "The building mask image: one bit per pixel saying whether that pixel is considered to be part of a rooftop or not.",
    dsm: "An image of the DSM (digital surface map) of the region. Values are in meters above EGM96 geoid (i.e., sea level). Invalid locations (where we don't have data) are stored as -9999",
    rgb: "An image of RGB data (aerial photo) of the region.",
    annualFlux: "The annual flux map (annual sunlight on roofs) of the region. Values are kWh/kW/year. This is unmasked flux: flux is computed for every location, not just building rooftops. Invalid locations are stored as -9999: locations outside our coverage area will be invalid, and a few locations inside the coverage area, where we were unable to calculate flux, will also be invalid.",
    monthlyFlux: "The monthly flux map (sunlight on roofs, broken down by month) of the region. Values are kWh/kW/year. The GeoTIFF pointed to by this URL will contain twelve bands, corresponding to January...December, in order.",
    hourlyShade: "Twelve URLs for hourly shade, corresponding to January...December, in order. Each GeoTIFF will contain 24 bands, corresponding to the 24 hours of the day. Each pixel is a 32 bit integer, corresponding to the (up to) 31 days of that month; a 1 bit means that the corresponding location is able to see the sun at that day, of that hour, of that month. Invalid locations are stored as -9999 (since this is negative, it has bit 31 set, and no valid value could have bit 31 set as that would correspond to the 32nd day of the month).",
  }

  const controls: Record<LayerId, JSX.Element> = {
    mask: maskSwitch,
    dsm: maskSwitch,
    rgb: maskSwitch,
    annualFlux: maskSwitch,
    monthlyFlux: <Stack>
      {monthSlider}
      {maskSwitch}
      {animationSwitch}
    </Stack>,
    hourlyShade: <Stack>
      {monthSlider}
      {daySlider}
      {hourSlider}
      {animationSwitch}
    </Stack>,
  }

  return <>
    <Autocomplete
      blurOnSelect
      size="small"
      renderInput={params =>
        <TextField {...params} variant="standard" label="Data layer" />
      }
      value={props.layerId}
      options={Object.keys(layerChoices) as LayerId[]}
      getOptionLabel={(id: LayerId) => layerChoices[id].label}
      onChange={(_, layerId) => props.onChange(layerId!)}
    />

    {props.error
      ? <Grid container justifyContent='center' pt={2}>
        <Typography variant='overline'>Data layer not available</Typography>
      </Grid>
      : props.layerId
        ? props.layer
          ? <>
            <Box py={1}>
              <Typography variant='body2' fontSize='small' fontStyle={{ color: '#616161' }}>
                {descriptions[props.layerId]}
              </Typography>
            </Box>
            {controls[props.layerId]}
          </>
          : <LinearProgress />
        : null
    }

  </>
}