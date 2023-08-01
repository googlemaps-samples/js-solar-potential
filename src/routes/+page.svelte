<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import { onMount } from 'svelte';

	import { findClosestBuilding, type BuildingInsightsResponse, type RequestError } from './solar';

	import SearchBar from './SearchBar.svelte';
	import BuildingInsightsSection from './sections/BuildingInsightsSection.svelte';
	import DataLayersSection from './sections/DataLayersSection.svelte';

	// TODO:
	// - Remove top bar
	//	 * 'Solar API demo' with 'View in GitHub' in side bar
	//	 * Search box in side bar
	// 	 * Add legal "Not an official Google product" in side bar
	// - Financial details

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
	const locations = {
		Home: '921 W San Gabriel Ave, Fresno, CA 93705'
	};
	let location: google.maps.LatLng | undefined;
	const zoom = 20;

	// let expandedSection: string = '🗺️ Data layer';
	let expandedSection: string = '';
	let configId: number = 0;

	let mapElement: HTMLElement;
	let autocompleteElement: HTMLInputElement;

	// Initialize app.
	let map: google.maps.Map;
	let spherical: typeof google.maps.geometry.spherical;
	onMount(async () => {
		// Load the Google Maps services.
		const loader = new Loader({ apiKey: googleMapsApiKey });
		const services = {
			core: loader.importLibrary('core'),
			maps: loader.importLibrary('maps'),
			places: loader.importLibrary('places')
		};
		spherical = await loader.importLibrary('geometry').then(({ spherical }) => spherical);

		// Get the address information for the default location.
		const geocoder = await services.core.then(() => new google.maps.Geocoder());
		const geocoderResponse = await geocoder.geocode({ address: locations.Home });

		// Initialize the map at the desired location.
		const { Map } = await services.maps;
		location = geocoderResponse.results[0].geometry.location;
		map = new Map(mapElement, {
			center: location,
			zoom: zoom,
			mapTypeId: 'satellite',
			fullscreenControl: false,
			streetViewControl: false,
			rotateControl: false,
			tilt: 0
		});

		showSolarPotential(location);

		// Initialize the address search autocomplete.
		const autocomplete = await services.places.then(
			() =>
				new google.maps.places.Autocomplete(autocompleteElement, {
					fields: ['formatted_address', 'geometry', 'name']
				})
		);
		autocomplete.addListener('place_changed', async () => {
			const place = autocomplete.getPlace();
			if (!place.geometry || !place.geometry.location) {
				autocompleteElement.value = '';
				return;
			}
			map.setCenter(place.geometry.location);
			map.setZoom(zoom);

			location = place.geometry.location;
			showSolarPotential(location);
		});
	});

	let buildingInsightsResponse: BuildingInsightsResponse | RequestError | undefined;
	async function showSolarPotential(location: google.maps.LatLng) {
		console.log('showSolarPotential');
		buildingInsightsResponse = undefined;

		try {
			buildingInsightsResponse = await findClosestBuilding(location, googleMapsApiKey);
		} catch (e) {
			buildingInsightsResponse = e as RequestError;
			return;
		}

		// Pick the midpoint solar configuration, around 50% capacity.
		configId = Math.round(buildingInsightsResponse.solarPotential.solarPanelConfigs.length / 2);

		// TODO: create solar panels
	}
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
				<BuildingInsightsSection
					bind:configId
					bind:expandedSection
					{buildingInsightsResponse}
					onRetry={() => {
						if (location) {
							buildingInsightsResponse = undefined;
							showSolarPotential(location);
						}
					}}
				/>

				{#if buildingInsightsResponse && !('error' in buildingInsightsResponse)}
					<md-divider inset />
					<DataLayersSection
						bind:expandedSection
						{buildingInsightsResponse}
						{googleMapsApiKey}
						{spherical}
						{map}
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

			<span class="pb-4 text-center on-surface-variant-text label-small">
				This is not an officially supported Google product.
			</span>
		</div>
	</aside>
</div>
