<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import { onMount } from 'svelte';

	import Card from './Card.svelte';
	import {
		findClosestBuilding,
		type BuildingInsightsResponse,
		type DataLayersResponse
	} from './solar';

	import '@material/web/list/list';
	import '@material/web/list/list-item';

	// TODO:
	// - Data layers
	// - Building insights
	// - More details
	// - Financial details
	// - Logo at the title
	// - Locations drop down

	const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
	const locations = {
		Home: '921 W San Gabriel Ave, Fresno, CA 93705'
	};
	let zoom = 20;

	let buildingInsights: BuildingInsightsResponse;
	let dataLayers: DataLayersResponse;
	async function getSolarPotential(location: google.maps.LatLng) {
		// buildingInsights = await findClosestBuilding(location, googleMapsApiKey);
	}

	// Initialize app.
	let mapElement: HTMLElement;
	onMount(async () => {
		// Load the Google Maps services.
		const loader = new Loader({ apiKey: googleMapsApiKey });
		const services = {
			core: loader.importLibrary('core'),
			maps: loader.importLibrary('maps'),
			places: loader.importLibrary('places')
		};

		// Get the address information for the default location.
		const geocoder = await services.core.then(() => new google.maps.Geocoder());
		const geocoderResponse = await geocoder.geocode({ address: locations.Home });

		// Initialize the map at the desired location.
		const { Map } = await services.maps;
		const location = geocoderResponse.results[0].geometry.location;
		const map = new Map(mapElement, {
			center: location,
			zoom: zoom,
			mapTypeId: 'satellite',
			fullscreenControl: false,
			streetViewControl: false
		});
		getSolarPotential(location);

		// Initialize the address search autocomplete.
		const input = document.getElementById('autocomplete') as HTMLInputElement;
		const autocomplete = await services.places.then(
			() =>
				new google.maps.places.Autocomplete(input, {
					fields: ['formatted_address', 'geometry', 'name']
				})
		);
		autocomplete.addListener('place_changed', async () => {
			const place = autocomplete.getPlace();
			if (!place.geometry || !place.geometry.location) {
				// User entered the name of a Place that was not suggested and
				// pressed the Enter key, or the Place Details request failed.
				input.value = '';
				return;
			}
			map.setCenter(place.geometry.location);
			map.setZoom(zoom);

			getSolarPotential(place.geometry.location);
		});
	});
</script>

<!-- Top bar -->
<nav class="flex flex-rows content-center p-2 shadow-md">
	<span class="text-lg">Solar API demo</span>
	<div class="grow" />
	<md-standard-icon-button
		aria-label="View code in GitHub"
		href="https://github.com/davidcavazos/solar-potential"
		target="_blank"
	>
		<md-icon>code</md-icon>
	</md-standard-icon-button>
</nav>

<div class="flex flex-row h-full">
	<!-- Main map -->
	<div bind:this={mapElement} class="w-full" />

	<!-- Side bar -->
	<aside class="flex-none w-64 md:w-96 p-2 pt-3">
		<input
			id="autocomplete"
			type="text"
			placeholder="Search an address"
			class="w-full shadow border rounded py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
		/>
		{#if buildingInsights}
			Building insights
		{:else}
			<Card />
		{/if}
	</aside>
</div>
