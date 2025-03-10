<!--
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 -->

 <script lang="ts">
  /* global google */

  import * as GMAPILoader from '@googlemaps/js-api-loader';
  const { Loader } = GMAPILoader;

  import { onMount } from 'svelte';

  import SearchBar from './components/SearchBar.svelte';
  import Sections from './sections/Sections.svelte';


  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const defaultPlace = {
    name: 'Rinconada Library',
    address: '1213 Newell Rd, Palo Alto, CA 94303',
  };
  let location: google.maps.LatLng | undefined;
  const zoom = 19;

  // Initialize app.
  let mapElement: HTMLElement;
  let map: google.maps.Map;
  let geometryLibrary: google.maps.GeometryLibrary;
  let mapsLibrary: google.maps.MapsLibrary;
  let placesLibrary: google.maps.PlacesLibrary;
  let drawingManager: google.maps.drawing.DrawingManager;
  let selectedPanel: google.maps.Rectangle | null = null;
  let panels: google.maps.Rectangle[] = [];
  const panelDimensions = {
    width: 4, // meters - standard solar panel width
    height: 2.1, // meters - standard solar panel height
    spacing: 0.1 // meters - spacing between panels
  };

  // Add panel style configuration
  const panelStyle = {
    fillColor: '#1a237e', // Dark blue color for solar panels
    fillOpacity: 0.9,
    strokeWeight: 1,
    strokeColor: '#ffffff', // White border
    draggable: true,
    clickable: true,
    editable: false  // Disable resizing handles
  };

  const selectedPanelStyle = {
    ...panelStyle,
    strokeColor: '#FFD700', // Yellow highlight
    strokeWeight: 1
  };

  // Add helper function to update panel styles
  function updatePanelStyles(panel: google.maps.Rectangle, isSelected: boolean) {
    const style = isSelected ? selectedPanelStyle : panelStyle;
    panel.setOptions(style);
  }

  // Helper function to move panel in a specific direction
  function movePanel(panel: google.maps.Rectangle, direction: 'left' | 'right' | 'up' | 'down') {
    const bounds = panel.getBounds();
    if (!bounds) return;
    
    const center = bounds.getCenter();
    const moveDistance = panelDimensions.width; // Distance to move
    
    let bearing;
    switch(direction) {
      case 'left': bearing = -90; break;
      case 'right': bearing = 90; break;
      case 'up': bearing = 0; break;
      case 'down': bearing = 180; break;
    }
    
    const newCenter = google.maps.geometry.spherical.computeOffset(
      center,
      moveDistance,
      bearing
    );
    
    const newBounds = new google.maps.LatLngBounds(
      google.maps.geometry.spherical.computeOffset(newCenter, -panelDimensions.height/2, 180),
      google.maps.geometry.spherical.computeOffset(newCenter, panelDimensions.width/2, 90)
    );
    
    panel.setBounds(newBounds);
  }

  onMount(async () => {
    // Load the Google Maps libraries.
    const loader = new Loader({ apiKey: googleMapsApiKey });
    const libraries = {
      geometry: loader.importLibrary('geometry'),
      maps: loader.importLibrary('maps'),
      places: loader.importLibrary('places'),
      drawing: loader.importLibrary('drawing'),
    };
    geometryLibrary = await libraries.geometry;
    mapsLibrary = await libraries.maps;
    placesLibrary = await libraries.places;

    // Get the address information for the default location.
    const geocoder = new google.maps.Geocoder();
    const geocoderResponse = await geocoder.geocode({
      address: defaultPlace.address,
    });
    const geocoderResult = geocoderResponse.results[0];

    // Initialize the map at the desired location.
    location = geocoderResult.geometry.location;
    map = new mapsLibrary.Map(mapElement, {
      center: location,
      zoom: zoom,
      tilt: 0,
      mapTypeId: 'satellite',
      mapTypeControl: false,
      fullscreenControl: false,
      rotateControl: false,
      streetViewControl: false,
      zoomControl: false,
      draggableCursor: 'crosshair',
    });

    // Initialize drawing manager
    drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: [google.maps.drawing.OverlayType.RECTANGLE],
      },
      rectangleOptions: panelStyle
    });
    
    drawingManager.setMap(map);

    // Handle new rectangle creation
    google.maps.event.addListener(drawingManager, 'rectanglecomplete', (rectangle: google.maps.Rectangle) => {
      const bounds = rectangle.getBounds();
      if (bounds) {
        const center = bounds.getCenter();
        const newBounds = new google.maps.LatLngBounds(
          google.maps.geometry.spherical.computeOffset(center, -panelDimensions.height/2, 180),
          google.maps.geometry.spherical.computeOffset(center, panelDimensions.width/2, 90)
        );
        rectangle.setBounds(newBounds);
      }

      // Deselect previous panel
      if (selectedPanel) {
        updatePanelStyles(selectedPanel, false);
      }
      
      updatePanelStyles(rectangle, true);
      selectedPanel = rectangle;
      panels.push(rectangle);

      // Add click listener for selection
      rectangle.addListener('click', () => {
        if (selectedPanel) {
          updatePanelStyles(selectedPanel, false);
        }
        selectedPanel = rectangle;
        updatePanelStyles(rectangle, true);
      });

      drawingManager.setDrawingMode(null);
    });
  });
</script>

<!-- Top bar -->
<div class="flex flex-row h-full">
  <!-- Main map -->
  <div bind:this={mapElement} class="w-full" />

  <!-- Side bar -->
  <aside class="flex-none md:w-96 w-80 p-2 pt-3 overflow-auto">
    <div class="flex flex-col space-y-2 h-full">
      {#if placesLibrary && map}
        <SearchBar bind:location {placesLibrary} {map} initialValue={defaultPlace.name} />
      {/if}

      <div class="p-4 surface-variant outline-text rounded-lg space-y-3">
        <p>
          <a
            class="primary-text"
            href="https://developers.google.com/maps/documentation/solar/overview?hl=en"
            target="_blank"
          >
            Two distinct endpoints of the <b>Solar API</b>
            <md-icon class="text-sm">open_in_new</md-icon>
          </a>
          offer many benefits to solar marketplace websites, solar installers, and solar SaaS designers.
        </p>

        <p>
          <b>Click on an area below</b>
          to see what type of information the Solar API can provide.
        </p>
      </div>

      {#if location}
        <Sections {location} {map} {geometryLibrary} {googleMapsApiKey} />
      {/if}

      <!-- Add control buttons to the side panel -->
      <div class="p-4 surface-variant outline-text rounded-lg space-y-3">
        <button
          class="primary-button"
          on:click={() => drawingManager?.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE)}
        >
          Add Solar Panel
        </button>
        
        {#if selectedPanel}
          <div class="grid grid-cols-3 gap-2 mt-2">
            <div></div>
            <button class="control-button" on:click={() => selectedPanel && movePanel(selectedPanel, 'up')}>↑</button>
            <div></div>
            <button class="control-button" on:click={() => selectedPanel && movePanel(selectedPanel, 'left')}>←</button>
            <button class="control-button" on:click={() => selectedPanel && movePanel(selectedPanel, 'down')}>↓</button>
            <button class="control-button" on:click={() => selectedPanel && movePanel(selectedPanel, 'right')}>→</button>
          </div>
          <button
            class="secondary-button"
            on:click={() => {
              selectedPanel?.setMap(null);
              panels = panels.filter(panel => panel !== selectedPanel);
              selectedPanel = null;
            }}
          >
            Remove Selected Panel
          </button>
        {/if}
      </div>

      <div class="grow" />

      <div class="flex flex-col items-center w-full">
        <md-text-button
          href="https://github.com/googlemaps-samples/js-solar-potential"
          target="_blank"
        >
          View code on GitHub
          <img slot="icon" src="github-mark.svg" alt="GitHub" width="16" height="16" />
        </md-text-button>
      </div>

      <span class="pb-4 text-center outline-text label-small">
        This is not an officially supported Google product.
      </span>
    </div>
  </aside>
</div>

<style>
.control-button {
  padding: 8px;
  background: #4a4a4a;
  color: white;
  border-radius: 4px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover {
  background: #666666;
}
</style>


