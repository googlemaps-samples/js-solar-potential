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

	import { slide } from 'svelte/transition';

	import Expandable from '../components/Expandable.svelte';
	import SummaryCard from '../components/SummaryCard.svelte';
	import type { SolarPanelConfig } from '../solar';
	import Table from '../components/Table.svelte';

	/* eslint-disable @typescript-eslint/ban-ts-comment */
	// @ts-ignore
	import { GoogleCharts } from 'google-charts';
	import { findSolarConfig, showMoney, showNumber } from '../utils';
	import InputNumber from '../components/InputNumber.svelte';
	import InputPanelsCount from '../components/InputPanelsCount.svelte';
	import InputMoney from '../components/InputMoney.svelte';
	import InputPercent from '../components/InputPercent.svelte';
	import InputRatio from '../components/InputRatio.svelte';

	export let expandedSection: string;
	export let configId: number;
	export let monthlyAverageEnergyBill: number;
	export let energyCostPerKwh: number;
	export let panelCapacityWatts: number;
	export let dcToAcDerate: number;
	export let solarPanelConfigs: SolarPanelConfig[];
	export let defaultPanelCapacityWatts: number;

	const icon = 'payments';
	const title = 'Solar Potential analysis';

	// Basic settings
	let panelCapacityRatio = 1.0;
	$: panelCapacityRatio = panelCapacityWatts / defaultPanelCapacityWatts;
	let solarIncentives: number = 7000;
	let installationCostPerWatt: number = 4.0;
	let installationLifeSpan = 20;

	// Advanced settings
	let efficiencyDepreciationFactor = 0.995;
	let costIncreaseFactor = 1.022;
	let discountRate = 1.04;

	// Calculations
	let installationCostTotal: number;
	$: installationCostTotal = installationCostPerWatt * installationSizeKw * 1000;

	let costChart: HTMLElement;
	let showAdvancedSettings = false;

	let installationSizeKw: number;
	$: if (solarPanelConfigs[configId]) {
		installationSizeKw = (solarPanelConfigs[configId].panelsCount * panelCapacityWatts) / 1000;
	}

	let monthlyKwhEnergyConsumption: number;
	$: monthlyKwhEnergyConsumption = monthlyAverageEnergyBill / energyCostPerKwh;

	let yearlyKwhEnergyConsumption: number;
	$: yearlyKwhEnergyConsumption = monthlyKwhEnergyConsumption * 12;

	let initialAcKwhPerYear: number;
	$: if (solarPanelConfigs[configId]) {
		initialAcKwhPerYear =
			solarPanelConfigs[configId].yearlyEnergyDcKwh * panelCapacityRatio * dcToAcDerate;
	}

	let yearlyProductionAcKwh: number[];
	$: yearlyProductionAcKwh = [...Array(installationLifeSpan).keys()].map(
		(year) => initialAcKwhPerYear * efficiencyDepreciationFactor ** year,
	);

	let yearlyUtilityBillEstimates: number[];
	$: yearlyUtilityBillEstimates = yearlyProductionAcKwh.map((yearlyKwhEnergyProduced, year) =>
		Math.max(
			((yearlyKwhEnergyConsumption - yearlyKwhEnergyProduced) *
				energyCostPerKwh *
				costIncreaseFactor ** year) /
				discountRate ** year,
			0,
		),
	);

	let remainingLifetimeUtilityBill: number;
	$: remainingLifetimeUtilityBill = yearlyUtilityBillEstimates.reduce((x, y) => x + y, 0);

	let costOfElectricityWithoutSolar: number;
	let yearlyCostWithoutSolar: number[];
	$: yearlyCostWithoutSolar = [...Array(installationLifeSpan).keys()].map(
		(year) => (monthlyAverageEnergyBill * 12 * costIncreaseFactor ** year) / discountRate ** year,
	);
	$: costOfElectricityWithoutSolar = yearlyCostWithoutSolar.reduce((x, y) => x + y, 0);

	let totalCostWithSolar: number;
	$: totalCostWithSolar = installationCostTotal + remainingLifetimeUtilityBill - solarIncentives;

	let savings: number;
	$: savings = costOfElectricityWithoutSolar - totalCostWithSolar;

	let energyCovered: number;
	$: energyCovered = yearlyProductionAcKwh[0] / yearlyKwhEnergyConsumption;

	let breakEvenYear: number = -1;
	$: GoogleCharts.load(
		() => {
			if (!costChart) {
				return;
			}
			const year = new Date().getFullYear();

			let costWithSolar = 0;
			const cumulativeCostsWithSolar = yearlyUtilityBillEstimates.map(
				(billEstimate, i) =>
					(costWithSolar +=
						i == 0 ? billEstimate + installationCostTotal - solarIncentives : billEstimate),
			);
			let costWithoutSolar = 0;
			const cumulativeCostsWithoutSolar = yearlyCostWithoutSolar.map(
				(cost) => (costWithoutSolar += cost),
			);
			breakEvenYear = cumulativeCostsWithSolar.findIndex(
				(costWithSolar, i) => costWithSolar <= cumulativeCostsWithoutSolar[i],
			);

			const data = google.visualization.arrayToDataTable([
				['Year', 'Solar', 'No solar'],
				[year.toString(), 0, 0],
				...cumulativeCostsWithSolar.map((_, i) => [
					(year + i + 1).toString(),
					cumulativeCostsWithSolar[i],
					cumulativeCostsWithoutSolar[i],
				]),
			]);

			/* eslint-disable @typescript-eslint/no-explicit-any */
			const googleCharts = google.charts as any;
			const chart = new googleCharts.Line(costChart);
			const options = googleCharts.Line.convertOptions({
				title: `Cost analysis for ${installationLifeSpan} years`,
				width: 350,
				height: 200,
			});
			chart.draw(data, options);
		},
		{ packages: ['line'] },
	);

	function updateConfig() {
		monthlyKwhEnergyConsumption = monthlyAverageEnergyBill / energyCostPerKwh;
		yearlyKwhEnergyConsumption = monthlyKwhEnergyConsumption * 12;
		panelCapacityRatio = panelCapacityWatts / defaultPanelCapacityWatts;
		configId = findSolarConfig(
			solarPanelConfigs,
			yearlyKwhEnergyConsumption,
			panelCapacityRatio,
			dcToAcDerate,
		);
	}
</script>

<Expandable
	bind:section={expandedSection}
	{icon}
	{title}
	subtitle="Values are only placeholders."
	subtitle2="Update with your own values."
	secondary
>
	<div class="flex flex-col space-y-4 pt-1">
		<InputMoney
			bind:value={monthlyAverageEnergyBill}
			icon="credit_card"
			label="Monthly average energy bill"
			onChange={updateConfig}
		/>

		<div class="inline-flex items-center space-x-2">
			<div class="grow">
				<InputPanelsCount bind:configId {solarPanelConfigs} />
			</div>
			<md-icon-button role={undefined} on:click={updateConfig}>
				<md-icon>sync</md-icon>
			</md-icon-button>
		</div>

		<InputMoney
			bind:value={energyCostPerKwh}
			icon="paid"
			label="Energy cost per kWh"
			onChange={updateConfig}
		/>

		<InputMoney
			bind:value={solarIncentives}
			icon="redeem"
			label="Solar incentives"
			onChange={updateConfig}
		/>

		<InputMoney
			bind:value={installationCostPerWatt}
			icon="request_quote"
			label="Installation cost per Watt"
			onChange={updateConfig}
		/>

		<InputNumber
			bind:value={panelCapacityWatts}
			icon="bolt"
			label="Panel capacity"
			suffix="Watts"
			onChange={updateConfig}
		/>

		<div class="flex flex-col items-center w-full">
			<md-text-button
				trailing-icon
				role={undefined}
				on:click={() => (showAdvancedSettings = !showAdvancedSettings)}
			>
				{showAdvancedSettings ? 'Hide' : 'Show'} advanced settings
				<md-icon slot="icon">
					{showAdvancedSettings ? 'expand_less' : 'expand_more'}
				</md-icon>
			</md-text-button>
		</div>

		{#if showAdvancedSettings}
			<div class="flex flex-col space-y-4" transition:slide={{ duration: 200 }}>
				<InputNumber
					bind:value={installationLifeSpan}
					icon="date_range"
					label="Installation lifespan"
					suffix="years"
					onChange={updateConfig}
				/>

				<InputPercent
					bind:value={dcToAcDerate}
					icon="dynamic_form"
					label="DC to AC conversion "
					onChange={updateConfig}
				/>

				<InputRatio
					bind:value={efficiencyDepreciationFactor}
					icon="trending_down"
					label="Panel efficiency decline per year"
					decrease
					onChange={updateConfig}
				/>

				<InputRatio
					bind:value={costIncreaseFactor}
					icon="price_change"
					label="Energy cost increase per year"
					onChange={updateConfig}
				/>

				<InputRatio
					bind:value={discountRate}
					icon="local_offer"
					label="Discount rate per year"
					onChange={updateConfig}
				/>
			</div>
		{/if}

		<div class="grid justify-items-end">
			<md-filled-tonal-button
				trailing-icon
				role={undefined}
				href="https://developers.google.com/maps/documentation/solar/calculate-costs-us"
				target="_blank"
			>
				More details
				<md-icon slot="icon">open_in_new</md-icon>
			</md-filled-tonal-button>
		</div>
	</div>
</Expandable>

<div class="absolute top-0 left-0">
	{#if expandedSection == title}
		<div class="flex flex-col space-y-2 m-2">
			<SummaryCard
				{icon}
				{title}
				rows={[
					{
						icon: 'energy_savings_leaf',
						name: 'Yearly energy',
						value: showNumber(
							(solarPanelConfigs[configId]?.yearlyEnergyDcKwh ?? 0) * panelCapacityRatio,
						),
						units: 'kWh',
					},
					{
						icon: 'speed',
						name: 'Installation size',
						value: showNumber(installationSizeKw),
						units: 'kW',
					},
					{
						icon: 'request_quote',
						name: 'Installation cost',
						value: showMoney(installationCostTotal),
					},
					{
						icon: [
							'battery_0_bar',
							'battery_1_bar',
							'battery_2_bar',
							'battery_3_bar',
							'battery_4_bar',
							'battery_5_bar',
							'battery_full',
						][Math.floor(Math.min(Math.round(energyCovered * 100) / 100, 1) * 6)],
						name: 'Energy covered',
						value: Math.round(energyCovered * 100).toString(),
						units: '%',
					},
				]}
			/>
		</div>

		<div class="mx-2 p-4 surface on-surface-text rounded-lg shadow-lg">
			<div bind:this={costChart} />
			<div class="w-full secondary-text">
				<Table
					rows={[
						{
							icon: 'wallet',
							name: 'Cost without solar',
							value: showMoney(costOfElectricityWithoutSolar),
						},
						{
							icon: 'wb_sunny',
							name: 'Cost with solar',
							value: showMoney(totalCostWithSolar),
						},
						{
							icon: 'savings',
							name: 'Savings',
							value: showMoney(savings),
						},
						{
							icon: 'balance',
							name: 'Break even',
							value:
								breakEvenYear >= 0
									? `${breakEvenYear + new Date().getFullYear() + 1} in ${breakEvenYear + 1}`
									: '--',
							units: 'years',
						},
					]}
				/>
			</div>
		</div>
	{/if}
</div>
