import { PropsWithChildren, useEffect, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader"
import parse from 'autosuggest-highlight/parse';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TextField from "@mui/material/TextField";
import Typography from '@mui/material/Typography';
import { Place } from "../common";

interface Props {
  googleMapsApiKey: string
  inputValue: string
  setInputValue: (value: string) => void
  onPlaceChanged: (place: Place) => void
}

// https://mui.com/material-ui/react-autocomplete/#google-maps-place
export default function SearchBar(props: PropsWithChildren<Props>) {
  const [address, setAddress] = useState('')
  const [options, setOptions] = useState<readonly google.maps.places.AutocompletePrediction[]>([])

  const googleMapsLoader = new Loader({ apiKey: props.googleMapsApiKey })
  const autocompleteLoader = googleMapsLoader
    .importLibrary('places')
    .then(() => new google.maps.places.AutocompleteService())
  const geocoderLoader = googleMapsLoader
    .importLibrary('core')
    .then(() => new google.maps.Geocoder())

  async function changeAddress(address: string) {
    setAddress(address)
    const geocoder = await geocoderLoader
    const response = await geocoder.geocode({ address: address })
    const result = response.results[0]
    if (result && result.geometry) {
      props.onPlaceChanged({
        address: result.formatted_address,
        center: {
          latitude: result.geometry.location.lat(),
          longitude: result.geometry.location.lng(),
        },
      })
    }
  }

  return <Autocomplete
    autoComplete
    onChange={async (_, place) => {
      if (place) {
        changeAddress(place.description)
      }
    }}
    options={options}
    getOptionLabel={option => option.description}
    inputValue={props.inputValue}
    onInputChange={(event, value) => {
      if (event) {
        // Change via user input.
        props.setInputValue(value)
      } else if (props.inputValue != address) {
        // Change via setInputValue().
        changeAddress(props.inputValue)
      }
    }}
    renderInput={params =>
      <TextField
        {...params}
        label="Search a location"
        fullWidth
        onChange={async event => {
          if (event.target.value.length >= 2) {
            const autocompleteService = await autocompleteLoader
            const response = await autocompleteService.getPlacePredictions({
              input: event.target.value,
              region: 'US',
            })
            setOptions(response.predictions)
          } else if (event.target.value.length == 0) {
            setOptions([])
          }
        }}
      />
    }
    renderOption={(props, option) => {
      const matches =
        option.structured_formatting.main_text_matched_substrings || [];

      const parts = parse(
        option.structured_formatting.main_text,
        matches.map((match: any) => [match.offset, match.offset + match.length]),
      );

      return (
        <li {...props}>
          <Grid container alignItems="center">
            <Grid item sx={{ display: 'flex', width: 44 }}>
              <LocationOnIcon sx={{ color: 'text.secondary' }} />
            </Grid>
            <Grid item sx={{ width: 'calc(100% - 44px)', wordWrap: 'break-word' }}>
              {parts.map((part, index) => (
                <Box
                  key={index}
                  component="span"
                  sx={{ fontWeight: part.highlight ? 'bold' : 'regular' }}
                >
                  {part.text}
                </Box>
              ))}
              <Typography variant="body2" color="text.secondary">
                {option.structured_formatting.secondary_text}
              </Typography>
            </Grid>
          </Grid>
        </li>
      );
    }}
  />
}