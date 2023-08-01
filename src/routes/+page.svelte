<script lang="ts">
	import { Loader } from '@googlemaps/js-api-loader';
	import { onMount } from 'svelte';

	import Expandable from './Expandable.svelte';
	import {
		findClosestBuilding,
		type BuildingInsightsResponse,
		type DataLayersResponse,
		type LayerId,
		showDate,
		showLatLng,
		getDataLayerUrls,
		type RequestError
	} from './solar';

	import type { MdDialog } from '@material/web/dialog/dialog';

	import Dropdown from './Dropdown.svelte';
	import Show from './Show.svelte';
	import ShowRecord from './ShowRecord.svelte';
	import { getLayer, type Layer } from './layer';
	import Calendar from './Calendar.svelte';

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

	const dataLayerOptions: Record<LayerId, string> = {
		mask: 'Roof mask',
		dsm: 'Digital Elevation Map',
		rgb: 'Aerial image',
		annualFlux: 'Annual sunshine',
		monthlyFlux: 'Monthly sunshine',
		hourlyShade: 'Hourly shade'
	};

	const monthNames = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];

	let expandedSection: string = '🗺️ Data layer';
	let layerId: LayerId = 'annualFlux';
	let configId: number = 0;

	let buildingInsightsDialog: MdDialog;
	let dataLayersDialog: MdDialog;

	// Initialize app.
	let mapElement: HTMLElement;
	let paletteElement: HTMLElement;
	let animationElement: HTMLElement;
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
		const location = geocoderResponse.results[0].geometry.location;
		map = new Map(mapElement, {
			center: location,
			zoom: zoom,
			mapTypeId: 'satellite',
			fullscreenControl: false,
			streetViewControl: false,
			rotateControl: false,
			tilt: 0
		});

		map.controls[google.maps.ControlPosition.TOP_LEFT].push(paletteElement);
		map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(animationElement);

		showSolarPotential(location);

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
				input.value = '';
				return;
			}
			map.setCenter(place.geometry.location);
			map.setZoom(zoom);

			showSolarPotential(place.geometry.location);
		});
	});

	let buildingInsightsResponse: BuildingInsightsResponse | RequestError | null = null;
	let dataLayersResponse: DataLayersResponse | RequestError | null = null;
	let layer: Layer | null = null;
	let overlays: google.maps.GroundOverlay[] = [];
	async function showSolarPotential(location: google.maps.LatLng) {
		console.log('showSolarPotential');
		buildingInsightsResponse = null;
		dataLayersResponse = null;
		overlays.map((overlay) => overlay.setMap(null));
		overlays = [];
		layer = null;

		try {
			buildingInsightsResponse = await findClosestBuilding(location, googleMapsApiKey);
		} catch (e) {
			buildingInsightsResponse = e as RequestError;
			return;
		}

		// Pick the midpoint solar configuration, around 50% capacity.
		configId = Math.round(buildingInsightsResponse.solarPotential.solarPanelConfigs.length / 2);

		// TODO: create solar panels

		showDataLayer(true);
	}

	let month = 3;
	let day = 14;
	let playAnimation = true;
	let showRoofOnly = false;
	let interval: NodeJS.Timer | undefined;
	async function showDataLayer(reset = false) {
		console.log('showDataLayer');
		if (reset) {
			let mapType = 'satellite';
			showRoofOnly = false;
			playAnimation = false;
			switch (layerId) {
				case 'rgb':
					mapType = 'roadmap';
					break;
				case 'annualFlux':
					showRoofOnly = true;
					break;
				case 'monthlyFlux':
					playAnimation = true;
					showRoofOnly = true;
					break;
				case 'hourlyShade':
					playAnimation = true;
					showRoofOnly = true;
					break;
			}
			map.setMapTypeId(mapType);
			overlays.map((overlay) => overlay.setMap(null));
			layer = null;
		}

		clearInterval(interval);
		if (!buildingInsightsResponse || 'error' in buildingInsightsResponse) {
			return;
		}

		if (!layer) {
			const center = buildingInsightsResponse.center;
			const ne = buildingInsightsResponse.boundingBox.ne;
			const sw = buildingInsightsResponse.boundingBox.sw;
			const diameter = spherical.computeDistanceBetween(
				new google.maps.LatLng(ne.latitude, ne.longitude),
				new google.maps.LatLng(sw.latitude, sw.longitude)
			);
			const radius = Math.ceil(diameter / 2);
			try {
				dataLayersResponse = await getDataLayerUrls(center, radius, googleMapsApiKey);
			} catch (e) {
				dataLayersResponse = e as RequestError;
				return;
			}

			try {
				layer = await getLayer(layerId, dataLayersResponse, googleMapsApiKey);
			} catch (e) {
				dataLayersResponse = e as RequestError;
				return;
			}
		}

		const bounds = layer.bounds;
		overlays.map((overlay) => overlay.setMap(null));
		console.log('Render layer:', {
			layerId: layer.id,
			showRoofOnly: showRoofOnly,
			month: month,
			day: day
		});
		overlays = layer
			.render(showRoofOnly, month, day)
			.map((canvas) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));

		switch (layer.id) {
			case 'monthlyFlux':
			case 'hourlyShade':
				initAnimation();
				break;
			default:
				overlays[0].setMap(map);
		}
	}

	let animationFrame = 0;
	function initAnimation() {
		animationFrame %= overlays.length;
		overlays.map((overlay) => overlay.setMap(null));
		if (playAnimation) {
			overlays[animationFrame].setMap(map);
			interval = setInterval(() => {
				overlays[animationFrame].setMap(null);
				animationFrame = (animationFrame + 1) % overlays.length;
				overlays[animationFrame].setMap(map);
			}, 1000);
		} else {
			clearInterval(interval);
			overlays[animationFrame].setMap(map);
		}
	}

	function buildingInsightsSummary(
		buildingInsightsResponse: BuildingInsightsResponse,
		configId: number
	) {
		const solarPotential = buildingInsightsResponse.solarPotential;
		const solarConfig = solarPotential.solarPanelConfigs[configId];
		return {
			'Config ID': configId,
			'Total panels': solarConfig.panelsCount,
			Center: `${showLatLng(buildingInsightsResponse.center)}`,
			'Carbon offset factor': `${solarPotential.carbonOffsetFactorKgPerMwh?.toFixed(1)} Kg/MWh`,
			'Maximum sunshine': `${solarPotential.maxSunshineHoursPerYear?.toFixed(1)} hr/year`,
			'Imagery date': `${showDate(buildingInsightsResponse.imageryDate)}`
		};
	}

	function dataLayersSummary(dataLayersResponse: DataLayersResponse) {
		return {
			'Imagery date': showDate(dataLayersResponse.imageryDate),
			'Imagery processed': showDate(dataLayersResponse.imageryProcessedDate),
			'Imagery quality': dataLayersResponse.imageryQuality
		};
	}
</script>

<!-- Top bar -->
<nav class="flex flex-rows content-center p-2 shadow-md">
	<span class="title-large">Solar API demo</span>
	<div class="grow" />
	<input
		id="autocomplete"
		type="text"
		placeholder="Search an address"
		class="surface-variant on-surface-variant-text md:w-96 w-64 rounded px-3 focus:outline-none focus:shadow-outline"
	/>
	<md-standard-icon-button
		class="ml-2"
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
	<aside class="flex-none md:w-96 w-80 p-2 pt-3 overflow-auto">
		<div class="rounded-md shadow-md">
			<!-- Building insights -->
			{#if !buildingInsightsResponse}
				<div class="grid py-8 place-items-center">
					<md-circular-progress four-color indeterminate />
				</div>
			{:else if 'error' in buildingInsightsResponse}
				<div class="error-container on-error-container-text">
					<Expandable
						bind:section={expandedSection}
						title="🏡 Building insights"
						subtitle={`Error: ${buildingInsightsResponse.error.message}`}
					>
						<div class="grid py-8 place-items-center">
							<p class="title-large">Error {buildingInsightsResponse.error.code}</p>
							<p class="body-medium">{buildingInsightsResponse.error.status}</p>
							<p class="label-medium">{buildingInsightsResponse.error.message}</p>
						</div>
					</Expandable>
				</div>
			{:else}
				<Expandable
					bind:section={expandedSection}
					title="🏡 Building insights"
					subtitle={`Yearly energy: ${(
						buildingInsightsResponse.solarPotential.solarPanelConfigs[configId].yearlyEnergyDcKwh /
						1000
					).toFixed(2)} MWh`}
				>
					<p class="label-medium on-surface-variant-text">
						{buildingInsightsResponse.solarPotential.solarPanelConfigs.length} possible configurations
					</p>

					<div class="flex flex-col pt-6">
						<p class="label-large text-center">Yearly energy</p>
						<div class="flex flex-row">
							<md-slider
								class="grow"
								max={buildingInsightsResponse.solarPotential.solarPanelConfigs.length - 1}
								on:change={(event) => (configId = event.target.value)}
							/>
							<span
								>{(
									buildingInsightsResponse.solarPotential.solarPanelConfigs[configId]
										.yearlyEnergyDcKwh / 1000
								).toFixed(2)} MWh</span
							>
						</div>
					</div>

					<ShowRecord fixed fields={buildingInsightsSummary(buildingInsightsResponse, configId)} />

					<div class="flex flex-row pt-4">
						<div class="grow" />
						<md-tonal-button
							role="button"
							tabindex={0}
							on:click={() => buildingInsightsDialog.show()}
							on:keyup={undefined}
						>
							More details
						</md-tonal-button>
					</div>

					<md-dialog bind:this={buildingInsightsDialog}>
						<span slot="headline">🏡 Building insights</span>
						<Show value={buildingInsightsResponse} label="buildingInsightsResponse" />
						<md-text-button slot="footer" dialog-action="close">Close</md-text-button>
					</md-dialog>
				</Expandable>
			{/if}
			<md-divider inset />

			<!-- Data layer info -->
			{#if !dataLayersResponse}
				{#if !buildingInsightsResponse || !('error' in buildingInsightsResponse)}
					<div class="grid py-8 place-items-center">
						<md-circular-progress four-color indeterminate />
					</div>
				{/if}
			{:else if 'error' in dataLayersResponse}
				<div class="grid py-12 place-items-center error-container on-error-container-text">
					<p class="title-large">Error {dataLayersResponse.error.code}</p>
					<p class="body-medium">{dataLayersResponse.error.status}</p>
					<p class="label-medium">{dataLayersResponse.error.message}</p>
				</div>
			{:else}
				<Expandable bind:section={expandedSection} title="🗺️ Data layer" subtitle={layerId}>
					<Dropdown
						bind:value={layerId}
						options={dataLayerOptions}
						onChange={() => showDataLayer(true)}
					/>

					{#if !layer}
						<div class="p-4">
							<md-linear-progress indeterminate />
						</div>
					{:else}
						<p class="m-2 px-4 py-2 surface-variant on-surface-variant-text label-small rounded-lg">
							{#if layerId == 'mask'}
								The building mask image: one bit per pixel saying whether that pixel is considered
								to be part of a rooftop or not.
							{:else if layerId == 'dsm'}
								An image of the DSM (digital surface map) of the region. Values are in meters above
								EGM96 geoid (i.e., sea level). Invalid locations (where we don't have data) are
								stored as -9999.
							{:else if layerId == 'rgb'}
								An image of RGB data (aerial photo) of the region.
							{:else if layerId == 'annualFlux'}
								The annual flux map (annual sunlight on roofs) of the region. Values are
								kWh/kW/year. This is unmasked flux: flux is computed for every location, not just
								building rooftops. Invalid locations are stored as -9999: locations outside our
								coverage area will be invalid, and a few locations inside the coverage area, where
								we were unable to calculate flux, will also be invalid.
							{:else if layerId == 'monthlyFlux'}
								The monthly flux map (sunlight on roofs, broken down by month) of the region. Values
								are kWh/kW/year. The GeoTIFF imagery file pointed to by this URL will contain twelve
								bands, corresponding to January...December, in order.
							{:else if layerId == 'hourlyShade'}
								Twelve URLs for hourly shade, corresponding to January...December, in order. Each
								GeoTIFF imagery file will contain 24 bands, corresponding to the 24 hours of the
								day. Each pixel is a 32 bit integer, corresponding to the (up to) 31 days of that
								month; a 1 bit means that the corresponding location is able to see the sun at that
								day, of that hour, of that month. Invalid locations are stored as -9999 (since this
								is negative, it has bit 31 set, and no valid value could have bit 31 set as that
								would correspond to the 32nd day of the month).
							{/if}
						</p>

						{#if layerId == 'hourlyShade'}
							<Calendar bind:month bind:day onChange={() => showDataLayer()} />
						{/if}

						<div class="flex flex-col">
							<label for="mask" class="p-2 relative inline-flex items-center cursor-pointer">
								<md-switch
									id="mask"
									role="checkbox"
									tabindex={0}
									aria-checked={showRoofOnly}
									selected={showRoofOnly}
									on:click={(event) => {
										showRoofOnly = event.target.selected;
										showDataLayer();
									}}
									on:keyup={undefined}
								/>
								<span class="ml-3 text-sm font-medium">Show roof only</span>
							</label>

							{#if ['monthlyFlux', 'hourlyShade'].includes(layerId)}
								<label for="mask" class="p-2 relative inline-flex items-center cursor-pointer">
									<md-switch
										id="mask"
										role="checkbox"
										tabindex={0}
										aria-checked={playAnimation}
										selected={playAnimation}
										on:click={(event) => {
											playAnimation = event.target.selected;
											initAnimation();
										}}
										on:keyup={undefined}
									/>
									<span class="ml-3 text-sm font-medium">Play animation</span>
								</label>
							{/if}
						</div>
					{/if}

					<div class="pt-4">
						<ShowRecord fixed fields={dataLayersSummary(dataLayersResponse)} />
					</div>

					<div class="flex flex-row pt-4">
						<div class="grow" />
						<md-tonal-button
							role="button"
							tabindex={0}
							on:click={() => dataLayersDialog.show()}
							on:keyup={undefined}
						>
							More details
						</md-tonal-button>
					</div>

					<md-dialog bind:this={dataLayersDialog}>
						<span slot="headline">🗺️ Data layers</span>
						<Show value={dataLayersResponse} label="dataLayersResponse" />
						<md-text-button slot="footer" dialog-action="close">Close</md-text-button>
					</md-dialog>
				</Expandable>
			{/if}
		</div>
	</aside>
</div>

<div class="absolute">
	<div bind:this={paletteElement} class="mt-2 lg:w-64 md:w-32 w-24">
		{#if layer && layer.palette}
			<div class="surface on-surface-text p-2 rounded-lg shadow-md">
				<div
					class="h-2 outline rounded-sm"
					style={`background: linear-gradient(to right, ${layer.palette.colors.map(
						(hex) => '#' + hex
					)})`}
				/>
				<div class="flex justify-between pt-1 label-small">
					<span>{layer.palette.min}</span>
					<span>{layer.palette.max}</span>
				</div>
			</div>
		{/if}
	</div>

	<div bind:this={animationElement} class="mb-5 p-2 lg:w-96 md:w-72 w-64">
		{#if !layer}
			<div />
		{:else if layer.id == 'monthlyFlux'}
			<div
				class="flex items-center surface on-surface-text text-center label-large rounded-full shadow-md"
			>
				<md-slider
					class="w-full"
					min={0}
					max={11}
					range={true}
					value-start={animationFrame}
					value-end={animationFrame}
					on:change={(event) => {
						overlays[animationFrame].setMap(null);
						if (event.target.valueStart != animationFrame) {
							animationFrame = event.target.valueStart;
							event.target.valueStart = animationFrame;
						} else {
							animationFrame = event.target.valueEnd;
							event.target.valueEnd = animationFrame;
						}
						overlays[animationFrame].setMap(map);
					}}
				/>
				<div class="w-16">
					<span class="">{monthNames[animationFrame]}</span>
				</div>
			</div>
		{:else if layerId == 'hourlyShade'}
			<div
				class="flex items-center pr-6 surface on-surface-text text-center label-large rounded-full shadow-md"
			>
				<md-slider
					class="w-full"
					min={0}
					max={23}
					range={true}
					value-start={animationFrame}
					value-end={animationFrame}
					on:change={(event) => {
						overlays[animationFrame].setMap(null);
						if (event.target.valueStart != animationFrame) {
							animationFrame = event.target.valueStart;
							event.target.valueStart = animationFrame;
						} else {
							animationFrame = event.target.valueEnd;
							event.target.valueEnd = animationFrame;
						}
						overlays[animationFrame].setMap(map);
					}}
				/>
				<div class="flex w-24 whitespace-nowrap">
					<span>
						{monthNames[month]}
						{day},
						{#if animationFrame == 0}
							12am
						{:else if animationFrame < 10}
							{animationFrame}am
						{:else if animationFrame < 12}
							{animationFrame}am
						{:else if animationFrame == 12}
							12pm
						{:else if animationFrame < 22}
							{animationFrame - 12}pm
						{:else}
							{animationFrame - 12}pm
						{/if}
					</span>
				</div>
			</div>
		{/if}
	</div>
</div>
