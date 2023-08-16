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
	import type { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field';
	import type { MdSlider } from '@material/web/slider/slider';

	/* eslint-disable @typescript-eslint/ban-ts-comment */
	// @ts-ignore
	import { GoogleCharts } from 'google-charts';

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
	const monthlyAverageEnergyBillUI = {
		show: () => monthlyAverageEnergyBill.toFixed(2),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			monthlyAverageEnergyBill = Number(target.value);
		},
	};

	let panelCapacityRatio = 1.0;
	$: panelCapacityRatio = panelCapacityWatts / defaultPanelCapacityWatts;
	$: configId = solarPanelConfigs.findIndex(
		(config) =>
			config.yearlyEnergyDcKwh * panelCapacityRatio * dcToAcDerate >= yearlyKWhEnergyConsumption,
	);
	$: console.log(panelCapacityRatio * dcToAcDerate);
	function configIdOnChange(event: Event) {
		const target = event.target as MdSlider;
		configId = target.value ?? 0;
	}

	const energyCostPerKwhUI = {
		show: () => energyCostPerKwh.toFixed(2),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			energyCostPerKwh = Number(target.value);
		},
	};

	let solarIncentives: number = 7000;
	const solarIncentivesUI = {
		show: () => solarIncentives.toFixed(2),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			solarIncentives = Number(target.value);
		},
	};

	let installationCostPerWatt: number = 4.0;
	const installationCostPerWattUI = {
		show: () => installationCostPerWatt.toFixed(2),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			installationCostPerWatt = Number(target.value);
		},
	};

	const panelCapacityWattsUI = {
		show: () => panelCapacityWatts.toString(),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			panelCapacityWatts = Number(target.value);
		},
	};

	let installationLifeSpan = 20;
	const installationLifeSpanUI = {
		show: () => installationLifeSpan.toString(),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			installationLifeSpan = Number(target.value);
		},
	};

	// Advanced settings
	const dcToAcDerateUI = {
		show: () => dcToAcDerate * 100,
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			dcToAcDerate = Number(target.value) / 100;
		},
	};

	let efficiencyDepreciationFactor = 0.995;
	const efficiencyDepreciationFactorUI = {
		show: () => ((1 - efficiencyDepreciationFactor) * 100).toFixed(1),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			efficiencyDepreciationFactor = 1 - Number(target.value) / 100;
		},
	};

	let costIncreaseFactor = 1.022;
	const costIncreaseFactorUI = {
		show: () => ((costIncreaseFactor - 1) * 100).toFixed(1),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			costIncreaseFactor = Number(target.value) / 100 + 1;
		},
	};

	let discountRate = 1.04;
	const discountRateUI = {
		show: () => ((discountRate - 1) * 100).toFixed(1),
		onChange: (event: Event) => {
			const target = event.target as MdOutlinedTextField;
			discountRate = Number(target.value) / 100 + 1;
		},
	};

	// Calculations
	let installationCostTotal: number;
	$: installationCostTotal = installationCostPerWatt * installationSizeKWh * 1000;

	let costChart: HTMLElement;
	let showAdvancedSettings = false;

	let installationSizeKWh: number;
	$: if (solarPanelConfigs[configId]) {
		installationSizeKWh = (solarPanelConfigs[configId].panelsCount * panelCapacityWatts) / 1000;
	}

	let monthlyKWhEnergyConsumption: number;
	$: monthlyKWhEnergyConsumption = monthlyAverageEnergyBill / energyCostPerKwh;

	let yearlyKWhEnergyConsumption: number;
	$: yearlyKWhEnergyConsumption = monthlyKWhEnergyConsumption * 12;

	let initialAcKWhPerYear: number;
	$: if (solarPanelConfigs[configId]) {
		initialAcKWhPerYear =
			solarPanelConfigs[configId].yearlyEnergyDcKwh * panelCapacityRatio * dcToAcDerate;
	}

	let yearlyProductionAcKWh: number[];
	$: yearlyProductionAcKWh = [...Array(installationLifeSpan).keys()].map(
		(year) => initialAcKWhPerYear * efficiencyDepreciationFactor ** year,
	);

	let yearlyUtilityBillEstimates: number[];
	$: yearlyUtilityBillEstimates = yearlyProductionAcKWh.map((yearlyKWhEnergyProduced, year) =>
		Math.max(
			((yearlyKWhEnergyConsumption - yearlyKWhEnergyProduced) *
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
	$: energyCovered = yearlyProductionAcKWh[0] / yearlyKWhEnergyConsumption;

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

	function showNumber(x: number) {
		return x.toLocaleString(undefined, { maximumFractionDigits: 1 });
	}

	function showMoney(amount: number) {
		return `$${amount.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
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
		<md-outlined-text-field
			type="number"
			label="Monthly average energy bill"
			value={monthlyAverageEnergyBillUI.show()}
			min={0}
			prefix-text="$"
			on:change={monthlyAverageEnergyBillUI.onChange}
		>
			<md-icon slot="leadingicon">credit_card</md-icon>
		</md-outlined-text-field>

		<div>
			<table class="table-auto w-full body-medium secondary-text">
				<tr>
					<td class="primary-text"><md-icon>solar_power</md-icon> </td>
					<th class="pl-2 text-left">Panels count</th>
					<td class="pl-2 text-right">
						<span>{solarPanelConfigs[configId]?.panelsCount} panels</span>
					</td>
				</tr>
			</table>
			<div>
				<md-slider
					class="w-full"
					value={configId}
					min={0}
					max={solarPanelConfigs.length - 1}
					on:change={configIdOnChange}
				/>
			</div>
		</div>

		<md-outlined-text-field
			type="number"
			label="Energy cost per KWh"
			value={energyCostPerKwhUI.show()}
			min={0}
			prefix-text="$"
			on:change={energyCostPerKwhUI.onChange}
		>
			<md-icon slot="leadingicon">paid</md-icon>
		</md-outlined-text-field>

		<md-outlined-text-field
			type="number"
			label="Solar incentives"
			value={solarIncentivesUI.show()}
			min={0}
			prefix-text="$"
			on:change={solarIncentivesUI.onChange}
		>
			<md-icon slot="leadingicon">redeem</md-icon>
		</md-outlined-text-field>

		<md-outlined-text-field
			type="number"
			label="Installation cost per Watt"
			value={installationCostPerWattUI.show()}
			min={0}
			prefix-text="$"
			on:change={installationCostPerWattUI.onChange}
		>
			<md-icon slot="leadingicon">request_quote</md-icon>
		</md-outlined-text-field>

		<md-outlined-text-field
			type="number"
			label="Panel capacity"
			value={panelCapacityWattsUI.show()}
			min={0}
			suffix-text="Watts"
			on:change={panelCapacityWattsUI.onChange}
		>
			<md-icon slot="leadingicon">bolt</md-icon>
		</md-outlined-text-field>

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
				<md-outlined-text-field
					type="number"
					label="Installation lifespan"
					value={installationLifeSpanUI.show()}
					min={0}
					suffix-text="years"
					on:change={installationLifeSpanUI.onChange}
				>
					<md-icon slot="leadingicon">date_range</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="DC to AC conversion efficiency"
					value={dcToAcDerateUI.show()}
					min={0}
					max={100}
					suffix-text="%"
					on:change={dcToAcDerateUI.onChange}
				>
					<md-icon slot="leadingicon">dynamic_form</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="Panel efficiency decline per year"
					value={efficiencyDepreciationFactorUI.show()}
					min={0}
					max={100}
					suffix-text="%"
					on:change={efficiencyDepreciationFactorUI.onChange}
				>
					<md-icon slot="leadingicon">trending_down</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="Energy cost increase per year"
					value={costIncreaseFactorUI.show()}
					min={0}
					max={100}
					suffix-text="%"
					on:change={costIncreaseFactorUI.onChange}
				>
					<md-icon slot="leadingicon">price_change</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="Energy discount increase per year"
					value={discountRateUI.show()}
					min={0}
					max={100}
					suffix-text="%"
					on:change={discountRateUI.onChange}
				>
					<md-icon slot="leadingicon">local_offer</md-icon>
				</md-outlined-text-field>
			</div>
		{/if}

		<div class="grid justify-items-end">
			<md-filled-tonal-button
				trailing-icon
				role={undefined}
				href="https://static.googleusercontent.com/media/www.google.com/en//get/sunroof/assets/cost-savings-methodology.pdf"
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
						units: 'KWh',
					},
					{
						icon: 'speed',
						name: 'Installation size',
						value: showNumber(installationSizeKWh),
						units: 'KWh',
					},
					{
						icon: 'request_quote',
						name: 'Installation cost',
						value: showMoney(installationCostTotal),
					},
					{
						icon: [
							'battery_1_bar',
							'battery_2_bar',
							'battery_3_bar',
							'battery_4_bar',
							'battery_5_bar',
							'battery_charging_full',
						][Math.floor(Math.min(energyCovered, 1) * 5)],
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
							value: breakEvenYear >= 0 ? breakEvenYear.toString() : '--',
							units: 'years',
						},
					]}
				/>
			</div>
		</div>
	{/if}
</div>
