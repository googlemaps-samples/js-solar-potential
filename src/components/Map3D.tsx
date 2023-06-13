import { PropsWithChildren, useCallback, useState } from 'react';
import DeckGL from '@deck.gl/react/typed'
import { FlyToInterpolator } from '@deck.gl/core/typed';
import { Tile3DLayer } from '@deck.gl/geo-layers/typed';

interface Props {
  googleMapsApiKey: string,
  latitude: number,
  longitude: number,
  zoom?: number,
  pitch?: number,
  bearing?: number,
}

export default function Map3D(props: PropsWithChildren<Props>) {
  const [initialViewState, setInitialViewState] = useState({
    latitude: props.latitude,
    longitude: props.longitude,
    zoom: props.zoom || 16,
    pitch: props.pitch || 60,
    bearing: props.bearing || 0,
    maxZoom: 24,
    maxPitch: 85,
  });

  const goToNYC = useCallback(() => {
    setInitialViewState({
      ...initialViewState,
      longitude: -74.1,
      latitude: 40.7,
      transitionDuration: 5000,
      transitionInterpolator: new FlyToInterpolator({ curve: 0.5 }),
    })
  }, [])

  return <DeckGL
    initialViewState={initialViewState}
    parameters={{ clearColor: [0.529, 0.808, 0.922, 1] }}
    controller={{ touchRotate: true }}
    layers={[
      new Tile3DLayer({
        id: 'google-3d-tiles',
        data: 'https://tile.googleapis.com/v1/3dtiles/root.json',
        loadOptions: {
          fetch: { headers: { 'X-GOOG-API-KEY': props.googleMapsApiKey } },
        },
        operation: 'terrain+draw'
      }),
    ]}
  // TODO: onViewStateChange -- update URL and last in history
  // TODO: onClick -- calculate solar + add to history
  >
    {props.children}
  </DeckGL>
}
