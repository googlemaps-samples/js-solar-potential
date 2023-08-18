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
