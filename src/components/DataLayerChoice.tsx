import { Autocomplete, FormControlLabel, LinearProgress, Slider, Switch, TextField } from "@mui/material"
import { DataLayer, LayerId, layerChoices } from "../services/solar/dataLayers"

interface Props {
  layerId: LayerId
  layer: DataLayer | null
  month: { get: number, set: (x: number) => void }
  day: { get: number, set: (x: number) => void }
  hour: { get: number, set: (x: number) => void }
  mask: { get: boolean, set: (x: boolean) => void }
  onChange: (layerId: LayerId) => void
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
      { value: 1, label: '1am' },
      { value: 4, label: '4am' },
      { value: 8, label: '8am' },
      { value: 12, label: '12pm' },
      { value: 16, label: '4pm' },
      { value: 20, label: '8pm' },
    ]} />

  return <>
    <Autocomplete
      size="small"
      renderInput={params =>
        <TextField {...params} variant="standard" label="Data layer" />
      }
      value={props.layerId}
      options={Object.keys(layerChoices) as LayerId[]}
      getOptionLabel={(id: LayerId) => layerChoices[id].label}
      onChange={(_, layerId) => props.onChange(layerId!)}
    />

    {
      props.layerId && props.layer ?
        {
          dsm: null,
          rgb: null,
          annualFlux: null,
          monthlyFlux: monthSlider,
          hourlyShade: <>
            {monthSlider}
            {daySlider}
            {hourSlider}
          </>,
        }[props.layerId]
        : <LinearProgress />
    }

    <FormControlLabel
      control={<Switch
        defaultChecked
        value={props.mask}
        onChange={(_, checked) => props.mask.set(checked)}
      />}
      label="Mask roof"
    />
  </>
}