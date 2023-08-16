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
	import type { MdDialog } from '@material/web/dialog/dialog';
	import Expandable from '../components/Expandable.svelte';
	import {
		type BuildingInsightsResponse,
		type RequestError,
		findClosestBuilding,
		type SolarPanelConfig,
	} from '../solar';
	import Show from '../components/Show.svelte';
	import SummaryCard from '../components/SummaryCard.svelte';
	import { createPalette, normalize, rgbToColor } from '../visualize';
	import { panelsPalette } from '../colors';

	export let configId: number;
	export let expandedSection: string;
	export let showDataLayer = true;
	export let panelCapacityWatts: number;
	export let monthlyAverageEnergyBill: number;
	export let energyCostPerKWh: number;
	export let dcToAcDerate: number;
	export let buildingInsightsResponse: BuildingInsightsResponse | RequestError | undefined;
	export let googleMapsApiKey: string;
	export let location: google.maps.LatLng;
	export let spherical: typeof google.maps.geometry.spherical;
	export let map: google.maps.Map;

	const icon = 'home';
	const title = 'Building Insights endpoint';

	let buildingInsightsDialog: MdDialog;

	let showPanels = true;

	let solarPanels: google.maps.Polygon[] = [];

	let panelCapacityRatio = 1.0;
	let solarPanelConfig: SolarPanelConfig | undefined;
	$: if (buildingInsightsResponse && !('error' in buildingInsightsResponse)) {
		solarPanelConfig = buildingInsightsResponse.solarPotential.solarPanelConfigs[configId];
		panelCapacityRatio =
			panelCapacityWatts / buildingInsightsResponse.solarPotential.panelCapacityWatts;
	}

	export async function showSolarPotential(location: google.maps.LatLng) {
		console.log('showSolarPotential');
		buildingInsightsResponse = undefined;
		solarPanels.map((panel) => panel.setMap(null));
		solarPanels = [];

		try {
			buildingInsightsResponse = await findClosestBuilding(location, googleMapsApiKey);
		} catch (e) {
			buildingInsightsResponse = e as RequestError;
			return;
		}

		// Default to the midpoint solar configuration, around 50% capacity.
		const solarPotential = buildingInsightsResponse.solarPotential;
		const yearlyKWhEnergyConsumption = (monthlyAverageEnergyBill / energyCostPerKWh) * 12;
		configId = solarPotential.solarPanelConfigs.findIndex(
			(config) =>
				config.yearlyEnergyDcKwh * panelCapacityRatio * dcToAcDerate >= yearlyKWhEnergyConsumption,
		);

		// Create the solar panels on the map.
		const palette = createPalette(panelsPalette, 256).map(rgbToColor);
		const minEnergy =
			solarPotential.solarPanels.slice(-1)[0].yearlyEnergyDcKwh * panelCapacityRatio;
		const maxEnergy = solarPotential.solarPanels[0].yearlyEnergyDcKwh * panelCapacityRatio;
		solarPanels = solarPotential.solarPanels.map((panel) => {
			const [w, h] = [solarPotential.panelWidthMeters / 2, solarPotential.panelHeightMeters / 2];
			const points = [
				{ x: +w, y: +h }, // top right
				{ x: +w, y: -h }, // bottom right
				{ x: -w, y: -h }, // bottom left
				{ x: -w, y: +h }, // top left
				{ x: +w, y: +h }, //  top right
			];
			const orientation = panel.orientation == 'PORTRAIT' ? 90 : 0;
			const azimuth = solarPotential.roofSegmentStats[panel.segmentIndex].azimuthDegrees;
			const colorIndex = Math.round(
				normalize(panel.yearlyEnergyDcKwh * panelCapacityRatio, maxEnergy, minEnergy) * 255,
			);
			return new google.maps.Polygon({
				paths: points.map(({ x, y }) =>
					spherical.computeOffset(
						{ lat: panel.center.latitude, lng: panel.center.longitude },
						Math.sqrt(x * x + y * y),
						Math.atan2(y, x) * (180 / Math.PI) + orientation + azimuth,
					),
				),
				strokeColor: '#B0BEC5',
				strokeOpacity: 0.9,
				strokeWeight: 1,
				fillColor: palette[colorIndex],
				fillOpacity: 0.9,
			});
		});
	}

	$: solarPanels.map((panel, i) =>
		panel.setMap(showPanels && i < (solarPanelConfig?.panelsCount ?? 0) ? map : null),
	);

	$: showSolarPotential(location);

	function showNumber(x: number) {
		return x.toLocaleString(undefined, { maximumFractionDigits: 1 });
	}
</script>

{#if !buildingInsightsResponse}
	<div class="grid py-8 place-items-center">
		<md-circular-progress four-color indeterminate />
	</div>
{:else if 'error' in buildingInsightsResponse}
	<div class="error-container on-error-container-text">
		<Expandable
			section={title}
			icon="error"
			{title}
			subtitle={buildingInsightsResponse.error.status}
		>
			<div class="grid py-8 place-items-center">
				<p class="title-large">ERROR {buildingInsightsResponse.error.code}</p>
				<p class="body-medium">{buildingInsightsResponse.error.status}</p>
				<p class="label-medium">{buildingInsightsResponse.error.message}</p>
				<md-filled-button
					class="pt-6"
					role={undefined}
					on:click={() => showSolarPotential(location)}
				>
					Retry
					<md-icon slot="icon">refresh</md-icon>
				</md-filled-button>
			</div>
		</Expandable>
	</div>
{:else if solarPanelConfig}
	<Expandable
		bind:section={expandedSection}
		{icon}
		{title}
		subtitle={`Yearly energy: ${(
			(solarPanelConfig.yearlyEnergyDcKwh * panelCapacityRatio) /
			1000
		).toFixed(2)} MWh`}
	>
		<div class="flex flex-col space-y-2 px-2">
			<span class="outline-text label-medium">
				<b>{title}</b> provides data on the location, dimensions & solar potential of a building.
			</span>

			<div>
				<table class="table-auto w-full body-medium secondary-text">
					<tr>
						<td class="primary-text"><md-icon>solar_power</md-icon> </td>
						<th class="pl-2 text-left">Panels count</th>
						<td class="pl-2 text-right">
							<span>{solarPanelConfig.panelsCount} panels</span>
						</td>
					</tr>
				</table>

				<md-slider
					class="w-full"
					value={configId}
					max={buildingInsightsResponse.solarPotential.solarPanelConfigs.length - 1}
					on:change={(event) => (configId = event.target.value)}
				/>
			</div>

			<md-outlined-text-field
				type="number"
				label="Panel capacity"
				value={panelCapacityWatts.toString()}
				min={0}
				suffix-text="Watts"
				on:change={(event) => (panelCapacityWatts = Number(event.target.value))}
			>
				<md-icon slot="leadingicon">bolt</md-icon>
			</md-outlined-text-field>

			<button
				class="p-2 relative inline-flex items-center"
				on:click={() => {
					showPanels = !showPanels;
				}}
			>
				<md-switch id="show-panels" role={undefined} selected={showPanels} />
				<span class="ml-3 body-large">Show panels</span>
			</button>

			<button
				class="p-2 relative inline-flex items-center"
				on:click={() => (showDataLayer = !showDataLayer)}
			>
				<md-switch id="show-panels" role={undefined} selected={showDataLayer} />
				<span class="ml-3 body-large">Show data layer</span>
			</button>

			<div class="grid justify-items-end">
				<md-filled-tonal-button role={undefined} on:click={() => buildingInsightsDialog.show()}>
					More details
				</md-filled-tonal-button>
			</div>

			<md-dialog bind:this={buildingInsightsDialog}>
				<span slot="headline">
					<div class="flex items-center">
						<md-icon>{icon}</md-icon>
						<b>&nbsp;{title}</b>
					</div>
				</span>
				<Show value={buildingInsightsResponse} label="buildingInsightsResponse" />
				<md-text-button slot="footer" dialog-action="close">Close</md-text-button>
			</md-dialog>
		</div>
	</Expandable>
{/if}

<div class="absolute top-0 left-0 w-72">
	{#if expandedSection == title && buildingInsightsResponse && !('error' in buildingInsightsResponse)}
		<div class="flex flex-col space-y-2 m-2">
			<SummaryCard
				{icon}
				{title}
				rows={[
					{
						icon: 'wb_sunny',
						name: 'Annual sunshine',
						value: showNumber(buildingInsightsResponse.solarPotential.maxSunshineHoursPerYear),
						units: 'hr',
					},
					{
						icon: 'square_foot',
						name: 'Roof area',
						value: showNumber(buildingInsightsResponse.solarPotential.wholeRoofStats.areaMeters2),
						units: 'm²',
					},
					{
						icon: 'solar_power',
						name: 'Max panel count',
						value: showNumber(buildingInsightsResponse.solarPotential.solarPanels.length),
						units: 'panels',
					},
					{
						icon: 'co2',
						name: 'CO₂ savings',
						value: showNumber(buildingInsightsResponse.solarPotential.carbonOffsetFactorKgPerMwh),
						units: 'Kg/MWh',
					},
				]}
			/>

			<div class="p-4 w-full surface on-surface-text rounded-lg shadow-md">
				<div class="flex justify-around">
					<div class="grid place-items-center">
						<p class="p-2 body-large">Panels count</p>
						<div class="relative" style="width: 72px; height: 72px">
							<md-circular-progress
								value={solarPanelConfig?.panelsCount}
								min={0}
								max={solarPanels.length}
								style="--md-circular-progress-size: 72px;"
							/>
							<md-icon-button class="absolute inset-0 m-auto">
								<md-icon class="primary-text">solar_power</md-icon>
							</md-icon-button>
						</div>
						<p class="p-2 body-medium">
							<span class="primary-text">
								<b>{showNumber(solarPanelConfig?.panelsCount ?? 0)}</b>
							</span>
							<span>/ {showNumber(solarPanels.length)}</span>
						</p>
					</div>

					<div class="grid place-items-center">
						<p class="p-2 body-large">Yearly energy</p>
						<div class="relative" style="width: 72px; height: 72px">
							<md-circular-progress
								value={(solarPanelConfig?.yearlyEnergyDcKwh ?? 0) * panelCapacityRatio}
								min={0}
								max={buildingInsightsResponse.solarPotential.solarPanelConfigs.slice(-1)[0]
									.yearlyEnergyDcKwh * panelCapacityRatio}
								style="--md-circular-progress-size: 72px;"
							/>
							<md-icon-button class="absolute inset-0 m-auto">
								<md-icon class="primary-text">energy_savings_leaf</md-icon>
							</md-icon-button>
						</div>
						<p class="p-2 body-medium">
							<span class="primary-text">
								<b>{showNumber((solarPanelConfig?.yearlyEnergyDcKwh ?? 0) * panelCapacityRatio)}</b>
							</span>
							<span>KWh</span>
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
