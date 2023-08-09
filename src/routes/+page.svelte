<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import { onMount } from 'svelte';

	import BuildingInsightsSection from './sections/BuildingInsightsSection.svelte';
	import DataLayersSection from './sections/DataLayersSection.svelte';
	import type { BuildingInsightsResponse, RequestError } from './solar';
	import FinancialBenefitsSection from './sections/FinancialBenefitsSection.svelte';
	import AnimationBar from './components/AnimationBar.svelte';
	import type { Layer } from './layer';
	import type { MdFilledTextField } from '@material/web/textfield/filled-text-field';

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
	const places: Record<string, string> = {
		'Mountain View Library': 'Mountain View Public Library',
	};
	let location: google.maps.LatLng | undefined;
	const zoom = 19;

	let expandedSection: string = '';
	let showDataLayer = true;
	let monthlyAverageEnergyBill = 300;
	let energyCostPerKWh = 0.31;
	let dcToAcDerate = 0.85;
	let configId = 0;

	let buildingInsightsResponse: BuildingInsightsResponse | RequestError | undefined;
	let mapElement: HTMLElement;
	let autocompleteElement: MdFilledTextField;
	let animationElement: HTMLElement;

	let frame = 0;
	let overlays: google.maps.GroundOverlay[];
	let layer: Layer;
	let month: number;
	let day: number;

	// Initialize app.
	let map: google.maps.Map;
	let spherical: typeof google.maps.geometry.spherical;
	onMount(async () => {
		// Load the Google Maps services.
		const loader = new Loader({ apiKey: googleMapsApiKey });

		// Get the address information for the default location.
		await loader.importLibrary('core');
		const geocoder = new google.maps.Geocoder();
		const address = places[Object.keys(places)[0]];
		const geocoderResponse = await geocoder.geocode({ address: address });
		const geocoderResult = geocoderResponse.results[0];
		autocompleteElement.value = address;

		// Load the spherical geometry to calculate distances.
		({ spherical } = await loader.importLibrary('geometry'));

		// Initialize the map at the desired location.
		const { Map } = await loader.importLibrary('maps');
		location = geocoderResult.geometry.location;
		map = new Map(mapElement, {
			center: location,
			zoom: zoom,
			tilt: 0,
			mapTypeId: 'satellite',
			mapTypeControl: false,
			fullscreenControl: false,
			rotateControl: false,
			streetViewControl: false,
			zoomControl: false,
		});
		map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(animationElement);

		if (geocoderResult.geometry.viewport) {
			// map.fitBounds(geocoderResult.geometry.viewport);
			map.setCenter(geocoderResult.geometry.location);
			map.setZoom(zoom);
		} else {
			map.setCenter(geocoderResult.geometry.location);
			map.setZoom(zoom);
		}

		// Initialize the address search autocomplete.
		const { Autocomplete } = await loader.importLibrary('places');
		const inputElement = autocompleteElement.renderRoot.querySelector('.input') as HTMLInputElement;
		const autocomplete = new Autocomplete(inputElement, {
			fields: ['formatted_address', 'geometry', 'name'],
		});
		autocomplete.addListener('place_changed', async () => {
			const place = autocomplete.getPlace();
			if (!place.geometry || !place.geometry.location) {
				autocompleteElement.value = '';
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
				autocompleteElement.value = place.name;
			} else if (place.formatted_address) {
				autocompleteElement.value = place.formatted_address;
			}
		});

		setInterval(() => {
			frame++;
		}, 1000);
	});
</script>

<!-- Top bar -->
<div class="flex flex-row h-full">
	<!-- Main map -->
	<div bind:this={mapElement} class="w-full" />

	<!-- Side bar -->
	<aside class="flex-none md:w-96 w-80 p-2 pt-3 overflow-auto">
		<div class="flex flex-col space-y-2 h-full">
			<md-filled-text-field bind:this={autocompleteElement} label="Search an address">
				<md-icon slot="leadingicon">search</md-icon>
			</md-filled-text-field>

			<div class="flex flex-col rounded-md shadow-md">
				{#if location}
					<BuildingInsightsSection
						bind:configId
						bind:expandedSection
						bind:buildingInsightsResponse
						bind:showDataLayer
						{monthlyAverageEnergyBill}
						{energyCostPerKWh}
						{dcToAcDerate}
						{googleMapsApiKey}
						{location}
						{spherical}
						{map}
					/>
				{/if}

				{#if buildingInsightsResponse && !('error' in buildingInsightsResponse)}
					<md-divider inset />
					<DataLayersSection
						bind:expandedSection
						bind:frame
						bind:overlays
						bind:layer
						bind:month
						bind:day
						{buildingInsightsResponse}
						{googleMapsApiKey}
						{showDataLayer}
						{spherical}
						{map}
					/>

					<md-divider inset />
					<FinancialBenefitsSection
						bind:expandedSection
						bind:configId
						bind:monthlyAverageEnergyBill
						bind:energyCostPerKWh
						bind:dcToAcDerate
						solarPanelConfigs={buildingInsightsResponse.solarPotential.solarPanelConfigs}
						panelCapacityWatts={buildingInsightsResponse.solarPotential.panelCapacityWatts}
					/>
				{/if}
			</div>

			<div class="grow" />

			<div class="flex flex-col items-center w-full">
				<md-text-button href="https://github.com/davidcavazos/solar-potential" target="_blank">
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

<div class="absolute">
	<AnimationBar bind:animationElement bind:frame {layer} {month} {day} />
</div>
