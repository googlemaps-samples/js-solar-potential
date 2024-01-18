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

  import { onMount } from 'svelte';
  import type { MdFilledTextField } from '@material/web/textfield/filled-text-field';

  export let location: google.maps.LatLng | undefined;

  export let placesLibrary: google.maps.PlacesLibrary;
  export let map: google.maps.Map;
  export let initialValue = '';
  export let zoom = 19;

  let textFieldElement: MdFilledTextField;

  onMount(async () => {
    // https://lit.dev/docs/components/shadow-dom/
    await textFieldElement.updateComplete;
    const inputElement = textFieldElement.renderRoot.querySelector('input') as HTMLInputElement;
    const autocomplete = new placesLibrary.Autocomplete(inputElement, {
      fields: ['formatted_address', 'geometry', 'name'],
    });
    autocomplete.addListener('place_changed', async () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        textFieldElement.value = '';
        return;
      }
      if (place.geometry.viewport) {
        // map.fitBounds(place.geometry.viewport);
        map.setCenter(place.geometry.location);
        map.setZoom(zoom);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(zoom);
      }

      location = place.geometry.location;
      if (place.name) {
        textFieldElement.value = place.name;
      } else if (place.formatted_address) {
        textFieldElement.value = place.formatted_address;
      }
    });
  });
</script>

<md-filled-text-field bind:this={textFieldElement} label="Search an address" value={initialValue}>
  <md-icon slot="leadingicon">search</md-icon>
</md-filled-text-field>
