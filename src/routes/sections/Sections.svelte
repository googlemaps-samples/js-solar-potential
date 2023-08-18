<script lang="ts">
	/* global google */

	import type { Layer } from '../layer';
	import type { BuildingInsightsResponse } from '../solar';
	import BuildingInsightsSection from './BuildingInsightsSection.svelte';
	import DataLayersSection from './DataLayersSection.svelte';
	import SolarPotentialSection from './SolarPotentialSection.svelte';

	export let frame: number;
	export let layer: Layer | null;
	export let month: number;
	export let day: number;

	export let location: google.maps.LatLng;
	export let map: google.maps.Map;
	export let geometryLibrary: google.maps.GeometryLibrary;
	export let googleMapsApiKey: string;

	let buildingInsights: BuildingInsightsResponse | undefined;

	// State
	let expandedSection: string = 'Solar Potential analysis';
	let showPanels = true;

	// User settings
	let monthlyAverageEnergyBill = 300;
	let panelCapacityWatts = 250;
	let energyCostPerKwh = 0.31;
	let dcToAcDerate = 0.85;

	// Calculations
	let yearlyEnergyUse: number;
	$: yearlyEnergyUse = (monthlyAverageEnergyBill / energyCostPerKwh) * 12;

	let configId: number | undefined;
	$: if (configId === undefined && buildingInsights) {
		const defaultPanelCapacity = buildingInsights.solarPotential.panelCapacityWatts;
		const panelCapacityRatio = panelCapacityWatts / defaultPanelCapacity;
		configId = buildingInsights.solarPotential.solarPanelConfigs.findIndex(
			(config) => config.yearlyEnergyDcKwh * panelCapacityRatio * dcToAcDerate >= yearlyEnergyUse,
		);
	}
</script>

<div class="flex flex-col rounded-md shadow-md">
	{#if geometryLibrary && map}
		<BuildingInsightsSection
			bind:expandedSection
			bind:buildingInsights
			bind:configId
			bind:panelCapacityWatts
			bind:showPanels
			{googleMapsApiKey}
			{geometryLibrary}
			{location}
			{map}
		/>
	{/if}

	{#if buildingInsights && configId !== undefined}
		<md-divider inset />
		<DataLayersSection
			bind:expandedSection
			bind:showPanels
			bind:frame
			bind:layer
			bind:month
			bind:day
			{googleMapsApiKey}
			{buildingInsights}
			{geometryLibrary}
			{map}
		/>

		<md-divider inset />
		<SolarPotentialSection
			bind:expandedSection
			bind:configId
			bind:monthlyAverageEnergyBill
			bind:energyCostPerKwh
			bind:panelCapacityWatts
			bind:dcToAcDerate
			solarPanelConfigs={buildingInsights.solarPotential.solarPanelConfigs}
			defaultPanelCapacityWatts={buildingInsights.solarPotential.panelCapacityWatts}
		/>
	{/if}
</div>
