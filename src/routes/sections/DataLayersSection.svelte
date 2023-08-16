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
	} from '../solar';
	import Show from '../components/Show.svelte';
	import SummaryCard from '../components/SummaryCard.svelte';
	import { onMount } from 'svelte';

	export let expandedSection: string;
	export let frame: number;
	export let overlays: google.maps.GroundOverlay[] = [];
	export let layer: Layer | null = null;
	export let month = 3;
	export let day = 14;
	export let buildingInsightsResponse: BuildingInsightsResponse;
	export let googleMapsApiKey: string;
	export let showDataLayer = true;
	export let spherical: typeof google.maps.geometry.spherical;
	export let map: google.maps.Map;

	const icon = 'layers';
	const title = 'Data Layers endpoint';

	const dataLayerOptions: Record<LayerId | 'none', string> = {
		none: 'No layer',
		mask: 'Roof mask',
		dsm: 'Digital Surface Model',
		rgb: 'Aerial image',
		annualFlux: 'Annual sunshine',
		monthlyFlux: 'Monthly sunshine',
		hourlyShade: 'Hourly shade',
	};

	let dataLayersResponse: DataLayersResponse | RequestError | undefined;
	let dataLayersDialog: MdDialog;
	let layerId: LayerId | 'none' = 'monthlyFlux';

	let showRoofOnly = false;
	let playAnimation = true;
	async function drawDataLayer(layerId: LayerId | 'none', reset = false) {
		if (reset) {
			showRoofOnly = ['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId);
			map.setMapTypeId(layerId == 'rgb' ? 'roadmap' : 'satellite');
			overlays.map((overlay) => overlay.setMap(null));
			layer = null;
			frame = layerId == 'hourlyShade' ? 5 : 0;
			playAnimation = ['monthlyFlux', 'hourlyShade'].includes(layerId);
		}
		if (layerId == 'none') {
			return;
		}

		if (!layer) {
			const center = buildingInsightsResponse.center;
			const ne = buildingInsightsResponse.boundingBox.ne;
			const sw = buildingInsightsResponse.boundingBox.sw;
			const diameter = spherical.computeDistanceBetween(
				new google.maps.LatLng(ne.latitude, ne.longitude),
				new google.maps.LatLng(sw.latitude, sw.longitude),
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
		if (!showDataLayer) {
			return;
		}

		console.log('Render layer:', {
			layerId: layer.id,
			showRoofOnly: showRoofOnly,
			month: month,
			day: day,
		});
		overlays.map((overlay) => overlay.setMap(null));
		overlays = layer
			.render(showRoofOnly, month, day)
			.map((canvas) => new google.maps.GroundOverlay(canvas.toDataURL(), bounds));

		if (!['monthlyFlux', 'hourlyShade'].includes(layer.id)) {
			overlays[0].setMap(map);
		}
	}

	$: if (layer && playAnimation) {
		if (layer.id == 'monthlyFlux') {
			overlays.map((overlay, i) => overlay.setMap(i == frame % 12 ? map : null));
		} else if (layer.id == 'hourlyShade') {
			overlays.map((overlay, i) => overlay.setMap(i == frame % 24 ? map : null));
		}
	}

	let stopFrame = 0;
	$: frame, (frame = playAnimation ? frame : stopFrame);

	onMount(() => drawDataLayer(layerId, true));
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
						drawDataLayer(layerId);
					}}
				>
					Retry
					<md-icon slot="icon">refresh</md-icon>
				</md-filled-button>
			</div>
		</Expandable>
	</div>
{:else}
	<Expandable bind:section={expandedSection} {icon} {title} subtitle={dataLayerOptions[layerId]}>
		<div class="flex flex-col space-y-2 px-2">
			<span class="outline-text label-medium">
				<b>{title}</b> provides raw and processed imagery and granular details on an area surrounding
				a location.
			</span>

			<Dropdown
				bind:value={layerId}
				options={dataLayerOptions}
				onChange={() => drawDataLayer(layerId, true)}
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
						<Calendar bind:month bind:day onChange={() => drawDataLayer(layerId)} />
					{/if}

					<label for="mask" class="p-2 relative inline-flex items-center cursor-pointer">
						<md-switch
							id="mask"
							role={undefined}
							selected={showRoofOnly}
							on:click={(event) => {
								showRoofOnly = event.target.selected;
								drawDataLayer(layerId);
							}}
						/>
						<span class="ml-3 body-large">Show roof only</span>
					</label>

					{#if ['monthlyFlux', 'hourlyShade'].includes(layerId)}
						<label for="mask" class="p-2 relative inline-flex items-center cursor-pointer">
							<md-switch
								id="mask"
								role={undefined}
								selected={playAnimation}
								on:click={(event) => {
									playAnimation = event.target.selected;
									if (playAnimation) {
										frame++;
									} else {
										stopFrame = frame;
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
							<md-icon>{icon}</md-icon>
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

<div class="absolute top-0 left-0 w-72">
	{#if expandedSection == title && layer}
		<div class="m-2">
			<SummaryCard {icon} {title} rows={[{ name: dataLayerOptions[layerId], value: '' }]}>
				<div class="flex flex-col space-y-4">
					<p class="outline-text">
						{#if layerId == 'mask'}
							The building mask image: one bit per pixel saying whether that pixel is considered to
							be part of a rooftop or not.
						{:else if layerId == 'dsm'}
							An image of the DSM (digital surface map) of the region. Values are in meters above
							EGM96 geoid (i.e., sea level). Invalid locations (where we don't have data) are stored
							as -9999.
						{:else if layerId == 'rgb'}
							An image of RGB data (aerial photo) of the region.
						{:else if layerId == 'annualFlux'}
							The annual flux map (annual sunlight on roofs) of the region. Values are kWh/kW/year.
							This is unmasked flux: flux is computed for every location, not just building
							rooftops. Invalid locations are stored as -9999: locations outside our coverage area
							will be invalid, and a few locations inside the coverage area, where we were unable to
							calculate flux, will also be invalid.
						{:else if layerId == 'monthlyFlux'}
							The monthly flux map (sunlight on roofs, broken down by month) of the region. Values
							are kWh/kW/year. The GeoTIFF imagery file pointed to by this URL will contain twelve
							bands, corresponding to January...December, in order.
						{:else if layerId == 'hourlyShade'}
							Twelve URLs for hourly shade, corresponding to January...December, in order. Each
							GeoTIFF imagery file will contain 24 bands, corresponding to the 24 hours of the day.
							Each pixel is a 32 bit integer, corresponding to the (up to) 31 days of that month; a
							1 bit means that the corresponding location is able to see the sun at that day, of
							that hour, of that month. Invalid locations are stored as -9999 (since this is
							negative, it has bit 31 set, and no valid value could have bit 31 set as that would
							correspond to the 32nd day of the month).
						{/if}
					</p>

					{#if layer.palette}
						<div>
							<div
								class="h-2 outline rounded-sm"
								style={`background: linear-gradient(to right, ${layer.palette.colors.map(
									(hex) => '#' + hex,
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
