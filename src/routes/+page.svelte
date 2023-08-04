<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import { onMount } from 'svelte';

	import SearchBar from './components/SearchBar.svelte';
	import BuildingInsightsSection from './sections/BuildingInsightsSection.svelte';
	import DataLayersSection from './sections/DataLayersSection.svelte';
	import type { BuildingInsightsResponse, RequestError } from './solar';
	import FinancialBenefitsSection from './sections/FinancialBenefitsSection.svelte';

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
	const locations = {
		Home: '921 W San Gabriel Ave, Fresno, CA 93705',
	};
	let location: google.maps.LatLng | undefined;
	const zoom = 20;

	let expandedSection: string = '';
	let showDataLayer = true;
	let monthlyAverageEnergyBill = 300;
	let energyCostPerKWh = 0.31;
	let dcToAcDerate = 0.85;
	let configId = 0;

	let buildingInsightsResponse: BuildingInsightsResponse | RequestError | undefined;
	let mapElement: HTMLElement;
	let autocompleteElement: HTMLInputElement;

	// Initialize app.
	let map: google.maps.Map;
	let spherical: typeof google.maps.geometry.spherical;
	onMount(async () => {
		// Load the Google Maps services.
		const loader = new Loader({ apiKey: googleMapsApiKey });

		// Get the address information for the default location.
		await loader.importLibrary('core');
		const geocoder = new google.maps.Geocoder();
		const geocoderResponse = await geocoder.geocode({ address: locations.Home });

		// Load the spherical geometry to calculate distances.
		({ spherical } = await loader.importLibrary('geometry'));

		// Initialize the map at the desired location.
		const { Map } = await loader.importLibrary('maps');
		location = geocoderResponse.results[0].geometry.location;
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

		// Initialize the address search autocomplete.
		const { Autocomplete } = await loader.importLibrary('places');
		const autocomplete = new Autocomplete(autocompleteElement, {
			fields: ['formatted_address', 'geometry', 'name'],
		});
		autocomplete.addListener('place_changed', async () => {
			const place = autocomplete.getPlace();
			if (!place.geometry || !place.geometry.location) {
				autocompleteElement.value = '';
				return;
			}
			map.setCenter(place.geometry.location);
			map.setZoom(zoom);

			location = place.geometry.location;
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
			<SearchBar bind:input={autocompleteElement} />

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
					<img slot="icon" src="github-mark.svg" alt="GitHub" />
				</md-text-button>
			</div>

			<span class="pb-4 text-center outline-text label-small">
				This is not an officially supported Google product.
			</span>
		</div>
	</aside>
</div>
