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

	import type { MdDialog } from '@material/web/dialog/dialog';
	import Calendar from '../components/Calendar.svelte';
	import Dropdown from '../components/Dropdown.svelte';
	import Expandable from '../components/Expandable.svelte';
	import { getLayer, type Layer } from '../layer';
	import {
		getDataLayerUrls,
		type BuildingInsightsResponse,
		type DataLayersResponse,
		type LayerId,
		type RequestError,
	} from '../solar';
	import InputBool from '../components/InputBool.svelte';
	import Show from '../components/Show.svelte';
	import SummaryCard from '../components/SummaryCard.svelte';
	import type { MdSlider } from '@material/web/slider/slider';

	export let expandedSection: string;
	export let showPanels = true;

	export let googleMapsApiKey: string;
	export let buildingInsights: BuildingInsightsResponse;
	export let geometryLibrary: google.maps.GeometryLibrary;
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
		'Dec',
	];

	let dataLayersResponse: DataLayersResponse | undefined;
	let requestError: RequestError | undefined;
	let apiResponseDialog: MdDialog;
	let layerId: LayerId | 'none' = 'monthlyFlux';
	let layer: Layer | undefined;

	let playAnimation = true;
	let tick = 0;
	let month = 0;
	let day = 14;
	let hour = 0;

	let overlays: google.maps.GroundOverlay[] = [];
	let showRoofOnly = false;
	async function showDataLayer(reset = false) {
		if (reset) {
			dataLayersResponse = undefined;
			requestError = undefined;
			layer = undefined;

			// Default values per layer.
			showRoofOnly = ['annualFlux', 'monthlyFlux', 'hourlyShade'].includes(layerId);
			map.setMapTypeId(layerId == 'rgb' ? 'roadmap' : 'satellite');
			overlays.map((overlay) => overlay.setMap(null));
			month = layerId == 'hourlyShade' ? 3 : 0;
			day = 14;
			hour = 5;
			playAnimation = ['monthlyFlux', 'hourlyShade'].includes(layerId);
		}
		if (layerId == 'none') {
			return;
		}

		if (!layer) {
			const center = buildingInsights.center;
			const ne = buildingInsights.boundingBox.ne;
			const sw = buildingInsights.boundingBox.sw;
			const diameter = geometryLibrary.spherical.computeDistanceBetween(
				new google.maps.LatLng(ne.latitude, ne.longitude),
				new google.maps.LatLng(sw.latitude, sw.longitude),
			);
			const radius = Math.ceil(diameter / 2);
			try {
				dataLayersResponse = await getDataLayerUrls(center, radius, googleMapsApiKey);
			} catch (e) {
				requestError = e as RequestError;
				return;
			}

			try {
				layer = await getLayer(layerId, dataLayersResponse, googleMapsApiKey);
			} catch (e) {
				requestError = e as RequestError;
				return;
			}
		}

		const bounds = layer.bounds;
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

	$: if (layer?.id == 'monthlyFlux') {
		overlays.map((overlay, i) => overlay.setMap(i == month ? map : null));
	} else if (layer?.id == 'hourlyShade') {
		overlays.map((overlay, i) => overlay.setMap(i == hour ? map : null));
	}

	function onSliderChange(event: Event) {
		const target = event.target as MdSlider;
		if (layer?.id == 'monthlyFlux') {
			if (target.valueStart != month) {
				month = target.valueStart ?? 0;
			} else if (target.valueEnd != month) {
				month = target.valueEnd ?? 0;
			}
			tick = month;
		} else if (layer?.id == 'hourlyShade') {
			if (target.valueStart != hour) {
				hour = target.valueStart ?? 0;
			} else if (target.valueEnd != hour) {
				hour = target.valueEnd ?? 0;
			}
			tick = hour;
		}
	}

	$: if (layer?.id == 'monthlyFlux') {
		if (playAnimation) {
			month = tick % 12;
		} else {
			tick = month;
		}
	} else if (layer?.id == 'hourlyShade') {
		if (playAnimation) {
			hour = tick % 24;
		} else {
			tick = hour;
		}
	}

	onMount(() => {
		showDataLayer(true);

		setInterval(() => {
			tick++;
		}, 1000);
	});
</script>

{#if requestError}
	<div class="error-container on-error-container-text">
		<Expandable section={title} icon="error" {title} subtitle={requestError.error.status}>
			<div class="grid place-items-center py-2 space-y-4">
				<div class="grid place-items-center">
					<p class="body-medium">
						Error on <code>dataLayers</code>
						{layerId} request
					</p>
					<p class="title-large">ERROR {requestError.error.code}</p>
					<p class="body-medium"><code>{requestError.error.status}</code></p>
					<p class="label-medium">{requestError.error.message}</p>
				</div>
				<md-filled-button role={undefined} on:click={() => showDataLayer(true)}>
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
				onChange={async () => showDataLayer(true)}
			/>

			{#if layerId == 'none'}
				<div />
			{:else if !layer}
				<md-linear-progress four-color indeterminate />
			{:else}
				{#if layer.id == 'hourlyShade'}
					<Calendar bind:month bind:day onChange={async () => showDataLayer()} />
				{/if}

				<InputBool bind:value={showPanels} label="Solar panels" />
				<InputBool bind:value={showRoofOnly} label="Roof only" onChange={() => showDataLayer()} />

				{#if ['monthlyFlux', 'hourlyShade'].includes(layerId)}
					<InputBool bind:value={playAnimation} label="Play animation" />
				{/if}
			{/if}
			<div class="flex flex-row">
				<div class="grow" />
				<md-filled-tonal-button role={undefined} on:click={() => apiResponseDialog.show()}>
					API response
				</md-filled-tonal-button>
			</div>

			<md-dialog bind:this={apiResponseDialog}>
				<div slot="headline">
					<div class="flex items-center primary-text">
						<md-icon>{icon}</md-icon>
						<b>&nbsp;{title}</b>
					</div>
				</div>
				<div slot="content">
					<Show value={dataLayersResponse} label="dataLayersResponse" />
				</div>
				<div slot="actions">
					<md-text-button role={undefined} on:click={() => apiResponseDialog.close()}>
						Close
					</md-text-button>
				</div>
			</md-dialog>
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

<div class="absolute bottom-6 left-0 w-full">
	<div class="md:mr-96 mr-80 grid place-items-center">
		{#if layer}
			<div
				class="flex items-center surface on-surface-text pr-4 text-center label-large rounded-full shadow-md"
			>
				{#if layer.id == 'monthlyFlux'}
					<md-slider
						range
						min={0}
						max={11}
						value-start={month}
						value-end={month}
						on:input={onSliderChange}
					/>
					<span class="w-8">{monthNames[month]}</span>
				{:else if layer.id == 'hourlyShade'}
					<md-slider
						range
						min={0}
						max={23}
						value-start={hour}
						value-end={hour}
						on:input={onSliderChange}
					/>
					<span class="w-24 whitespace-nowrap">
						{monthNames[month]}
						{day},
						{#if hour == 0}
							12am
						{:else if hour < 10}
							{hour}am
						{:else if hour < 12}
							{hour}am
						{:else if hour == 12}
							12pm
						{:else if hour < 22}
							{hour - 12}pm
						{:else}
							{hour - 12}pm
						{/if}
					</span>
				{/if}
			</div>
		{/if}
	</div>
</div>
