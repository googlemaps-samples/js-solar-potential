<script lang="ts">
	import type { MdDialog } from '@material/web/dialog/dialog';
	import Calendar from '../components/Calendar.svelte';
	import Dropdown from '../components/Dropdown.svelte';
	import Expandable from '../components/Expandable.svelte';
	import { getLayer, type Layer, type Palette } from '../layer';
	import {
		getDataLayerUrls,
		type BuildingInsightsResponse,
		type DataLayersResponse,
		type LayerId,
		type RequestError,
		showDate
	} from '../solar';
	import Show from '../components/Show.svelte';
	import { onMount } from 'svelte';
	import SummaryCard from '../components/SummaryCard.svelte';

	export let title = 'Data Layers';
	export let expandedSection: string;
	export let buildingInsightsResponse: BuildingInsightsResponse;
	export let googleMapsApiKey: string;
	export let showDataLayer = true;
	export let spherical: typeof google.maps.geometry.spherical;
	export let map: google.maps.Map;

	const dataLayerOptions: Record<LayerId | 'none', string> = {
		none: 'No layer',
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

	let animationElement: HTMLElement;
	let paletteElement: HTMLElement;

	let dataLayersResponse: DataLayersResponse | RequestError | undefined;
	let dataLayersDialog: MdDialog;
	let layerId: LayerId | 'none' = 'monthlyFlux';
	let layer: Layer | null = null;
	let month = 3;
	let day = 14;

	let showRoofOnly = false;
	let overlays: google.maps.GroundOverlay[] = [];
	let animation: NodeJS.Timer | undefined;
	async function drawDataLayer(reset = false) {
		clearInterval(animation);
		if (reset) {
			showRoofOnly = ['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId);
			map.setMapTypeId(layerId == 'rgb' ? 'roadmap' : 'satellite');
			overlays.map((overlay) => overlay.setMap(null));
			layer = null;
			animationFrame = layerId == 'hourlyShade' ? 5 : 0;
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

			if (layerId == 'none') {
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
		if (!showDataLayer) {
			return;
		}

		console.log('Render layer:', {
			layerId: layer.id,
			showRoofOnly: showRoofOnly,
			month: month,
			day: day
		});
		overlays = layer
			.render(showRoofOnly, month, day)
			.map((canvas) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));

		if (layer.id == 'monthlyFlux') {
			playAnimation();
		} else if (layer.id == 'hourlyShade') {
			playAnimation();
		} else {
			overlays[0].setMap(map);
		}
	}

	let animationFrame = 0;
	function playAnimation() {
		clearInterval(animation);
		overlays[animationFrame].setMap(map);
		animation = setInterval(() => {
			overlays[animationFrame].setMap(null);
			animationFrame = (animationFrame + 1) % overlays.length;
			overlays[animationFrame].setMap(map);
		}, 1000);
	}

	$: showDataLayer, drawDataLayer();

	onMount(() => {
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(paletteElement);
		map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(animationElement);
		drawDataLayer(true);
	});
</script>

{#if !dataLayersResponse}
	<div class="grid py-8 place-items-center">
		<md-circular-progress four-color indeterminate />
	</div>
{:else if 'error' in dataLayersResponse}
	<div class="error-container on-error-container-text">
		<Expandable section={title} icon="error" {title} subtitle={dataLayersResponse.error.status}>
			<div class="grid py-8 place-items-center">
				<p class="title-large">ERROR {dataLayersResponse.error.code}</p>
				<p class="body-medium">{dataLayersResponse.error.status}</p>
				<p class="label-medium">{dataLayersResponse.error.message}</p>
				<md-filled-button
					class="pt-6"
					role={undefined}
					on:click={() => {
						dataLayersResponse = undefined;
						drawDataLayer();
					}}
				>
					Retry
					<md-icon slot="icon">refresh</md-icon>
				</md-filled-button>
			</div>
		</Expandable>
	</div>
{:else}
	<Expandable
		bind:section={expandedSection}
		icon="layers"
		{title}
		subtitle={dataLayerOptions[layerId]}
	>
		<div class="flex flex-col space-y-2 px-2">
			<span class="outline-text label-medium">
				<b>{title}</b> provides raw and processed imagery and granular details on an area surrounding
				a location.
			</span>

			<Dropdown
				bind:value={layerId}
				options={dataLayerOptions}
				onChange={(layerId) => {
					drawDataLayer(true);
				}}
			/>

			{#if dataLayersResponse}
				{#if layerId == 'none'}
					<div />
				{:else if !layer}
					<div class="p-4">
						<md-linear-progress indeterminate />
					</div>
				{:else}
					{#if layerId == 'hourlyShade'}
						<Calendar bind:month bind:day onChange={() => drawDataLayer()} />
					{/if}

					<label for="mask" class="p-2 relative inline-flex items-center cursor-pointer">
						<md-switch
							id="mask"
							role={undefined}
							selected={showRoofOnly}
							on:click={(event) => {
								showRoofOnly = event.target.selected;
								drawDataLayer();
							}}
						/>
						<span class="ml-3 body-large">Show roof only</span>
					</label>

					{#if ['monthlyFlux', 'hourlyShade'].includes(layerId)}
						<label for="mask" class="p-2 relative inline-flex items-center cursor-pointer">
							<md-switch
								id="mask"
								role={undefined}
								selected={!!animation}
								on:click={(event) => {
									clearInterval(animation);
									if (event.target.selected) {
										playAnimation();
									}
								}}
							/>
							<span class="ml-3 body-large">Play animation</span>
						</label>
					{/if}
				{/if}
				<div class="flex flex-row">
					<div class="grow" />
					<md-tonal-button role={undefined} on:click={() => dataLayersDialog.show()}>
						More details
					</md-tonal-button>
				</div>

				<md-dialog bind:this={dataLayersDialog}>
					<span slot="headline">
						<div class="flex items-center">
							<md-icon>layers</md-icon>
							<b>&nbsp;{title}</b>
						</div>
					</span>
					<Show value={dataLayersResponse} label="dataLayersResponse" />
					<md-text-button slot="footer" dialog-action="close">Close</md-text-button>
				</md-dialog>
			{/if}
		</div>
	</Expandable>
{/if}

<div class="absolute">
	<div bind:this={paletteElement} class="w-72">
		{#if expandedSection == title && layer}
			<div class="m-2">
				<SummaryCard icon="layers" {title} rows={[{ name: dataLayerOptions[layerId], value: '' }]}>
					<div class="flex flex-col space-y-4">
						<p class="outline-text">
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

						{#if layer.palette}
							<div>
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
				</SummaryCard>
			</div>
		{/if}
	</div>

	<div bind:this={animationElement} class="mb-5 p-2 lg:w-96 w-80">
		{#if !layer}
			<div />
		{:else if layer.id == 'monthlyFlux'}
			<div
				class="flex items-center surface on-surface-text pr-4 text-center label-large rounded-full shadow-md"
			>
				<md-slider
					class="grow"
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
				<span class="w-8">{monthNames[animationFrame]}</span>
			</div>
		{:else if layer.id == 'hourlyShade'}
			<div
				class="flex items-center surface on-surface-text pr-4 text-center label-large rounded-full shadow-md"
			>
				<md-slider
					class="grow"
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
				<span class="w-24 whitespace-nowrap">
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
		{/if}
	</div>
</div>
