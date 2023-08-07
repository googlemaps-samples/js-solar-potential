<script lang="ts">
	import { slide } from 'svelte/transition';
	import { GoogleCharts } from 'google-charts';

	import Expandable from '../components/Expandable.svelte';
	import SummaryCard from '../components/SummaryCard.svelte';
	import type { SolarPanelConfig } from '../solar';
	import Table from '../components/Table.svelte';

	export let expandedSection: string;
	export let configId: number;
	export let monthlyAverageEnergyBill: number;
	export let energyCostPerKWh: number;
	export let dcToAcDerate: number;
	export let solarPanelConfigs: SolarPanelConfig[];
	export let panelCapacityWatts: number;

	const icon = 'payments';
	const title = 'Financial Benefits';

	let costChart: HTMLElement;
	let showAdvancedSettings = false;

	let installationSizeKWh: number;
	$: installationSizeKWh = (solarPanelConfigs[configId].panelsCount * panelCapacityWatts) / 1000;

	let monthlyKWhEnergyConsumption: number;
	$: monthlyKWhEnergyConsumption = monthlyAverageEnergyBill / energyCostPerKWh;

	let yearlyKWhEnergyConsumption: number;
	$: yearlyKWhEnergyConsumption = monthlyKWhEnergyConsumption * 12;

	let initialAcKWhPerYear: number;
	$: initialAcKWhPerYear = solarPanelConfigs[configId].yearlyEnergyDcKwh * dcToAcDerate;

	let installationLifeSpan = 20;
	let efficiencyDepreciationFactor = 0.995;
	let yearlyProductionAcKWh: number[];
	$: yearlyProductionAcKWh = [...Array(installationLifeSpan).keys()].map(
		(year) => initialAcKWhPerYear * efficiencyDepreciationFactor ** year,
	);

	let lifetimeProductionAcKWh: number;
	$: lifetimeProductionAcKWh = yearlyProductionAcKWh.reduce((x, y) => x + y, 0);

	let costIncreaseFactor = 1.022;
	let discountRate = 1.04;
	let yearlyUtilityBillEstimates: number[];
	$: yearlyUtilityBillEstimates = yearlyProductionAcKWh.map((yearlyKWhEnergyProduced, year) =>
		Math.max(
			((yearlyKWhEnergyConsumption - yearlyKWhEnergyProduced) *
				energyCostPerKWh *
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

	let installationCostPerWatt: number = 4.5;
	let installationCost: number;
	$: installationCost = installationCostPerWatt * installationSizeKWh * 1000;

	let solarIncentives: number = 7000;
	let totalCostWithSolar: number;
	$: totalCostWithSolar = installationCost + remainingLifetimeUtilityBill - solarIncentives;

	let savings: number;
	$: savings = costOfElectricityWithoutSolar - totalCostWithSolar;

	let energyCovered: number;
	$: energyCovered = yearlyProductionAcKWh[0] / yearlyKWhEnergyConsumption;

	$: configId = solarPanelConfigs.findIndex(
		(config) => config.yearlyEnergyDcKwh * dcToAcDerate >= yearlyKWhEnergyConsumption,
	);

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
						i == 0 ? billEstimate + installationCost - solarIncentives : billEstimate),
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

			const chart = new google.charts.Line(costChart);
			const options = google.charts.Line.convertOptions({
				title: `Cost analysis for ${installationLifeSpan} years`,
				width: 350,
				height: 200,
			});
			chart.draw(data, options);
		},
		{ packages: ['line'] },
	);

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
	subtitle={`Savings: ${showMoney(savings)} in ${installationLifeSpan} years`}
>
	<div class="flex flex-col space-y-4 pt-1">
		<md-outlined-text-field
			type="number"
			label="Average monthly energy bill"
			value={monthlyAverageEnergyBill.toFixed(2)}
			prefix-text="$"
			on:change={(event) => (monthlyAverageEnergyBill = Number(event.target.value))}
		>
			<md-icon slot="leadingicon">credit_card</md-icon>
		</md-outlined-text-field>

		<md-outlined-text-field
			type="number"
			label="Energy cost per KWh"
			value={energyCostPerKWh}
			prefix-text="$"
			on:change={(event) => (energyCostPerKWh = Number(event.target.value))}
		>
			<md-icon slot="leadingicon">paid</md-icon>
		</md-outlined-text-field>

		<md-outlined-text-field
			type="number"
			label="Solar tax credit incentive"
			value={solarIncentives.toFixed(2)}
			prefix-text="$"
			on:change={(event) => (solarIncentives = Number(event.target.value))}
		>
			<md-icon slot="leadingicon">savings</md-icon>
		</md-outlined-text-field>

		<md-divider inset />

		<div>
			<table class="table-auto w-full body-medium secondary-text">
				<tr>
					<td class="primary-text"><md-icon>solar_power</md-icon> </td>
					<th class="pl-2 text-left">Panels count</th>
					<td class="pl-2 text-right">
						<span>{solarPanelConfigs[configId].panelsCount} panels</span>
					</td>
				</tr>
			</table>

			<md-slider
				class="w-full"
				value={configId ?? 0}
				max={solarPanelConfigs.length - 1}
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

		<md-outlined-text-field
			type="number"
			label="Installation cost per Watt"
			value={installationCostPerWatt.toFixed(2)}
			min={0}
			prefix-text="$"
			on:change={(event) => (installationCostPerWatt = Number(event.target.value))}
		>
			<md-icon slot="leadingicon">request_quote</md-icon>
		</md-outlined-text-field>

		<md-divider inset />

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
					value={installationLifeSpan.toString()}
					min={0}
					suffix-text="years"
					on:change={(event) => (installationLifeSpan = Number(event.target.value))}
				>
					<md-icon slot="leadingicon">date_range</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="DC to AC conversion efficiency"
					value={dcToAcDerate * 100}
					min={0}
					max={100}
					suffix-text="%"
					on:change={(event) => (dcToAcDerate = Number(event.target.value / 100))}
				>
					<md-icon slot="leadingicon">dynamic_form</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="Panel efficiency decline per year"
					value={((1 - efficiencyDepreciationFactor) * 100).toFixed(1)}
					min={0}
					max={100}
					suffix-text="%"
					on:change={(event) =>
						(efficiencyDepreciationFactor = 1 - Number(event.target.value / 100))}
				>
					<md-icon slot="leadingicon">trending_down</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="Energy cost increase per year"
					value={((costIncreaseFactor - 1) * 100).toFixed(1)}
					min={0}
					max={100}
					suffix-text="%"
					on:change={(event) => (costIncreaseFactor = Number(event.target.value / 100) + 1)}
				>
					<md-icon slot="leadingicon">price_change</md-icon>
				</md-outlined-text-field>

				<md-outlined-text-field
					type="number"
					label="Energy discount increase per year"
					value={((discountRate - 1) * 100).toFixed(1)}
					min={0}
					max={100}
					suffix-text="%"
					on:change={(event) => (discountRate = Number(event.target.value / 100) + 1)}
				>
					<md-icon slot="leadingicon">local_offer</md-icon>
				</md-outlined-text-field>
			</div>
		{/if}

		<div class="grid justify-items-end">
			<md-tonal-button
				trailing-icon
				role={undefined}
				href="https://static.googleusercontent.com/media/www.google.com/en//get/sunroof/assets/cost-savings-methodology.pdf"
				target="_blank"
			>
				More details
				<md-icon slot="icon">open_in_new</md-icon>
			</md-tonal-button>
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
						icon: 'solar_power',
						name: 'Panels count',
						value: solarPanelConfigs[configId].panelsCount,
						units: 'panels',
					},
					{
						icon: 'speed',
						name: 'Installation size',
						value: installationSizeKWh,
						units: 'KWh',
					},
					{
						icon: 'request_quote',
						name: 'Installation cost',
						value: showMoney(installationCost),
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
						value: Math.round(energyCovered * 100),
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
							value: breakEvenYear >= 0 ? breakEvenYear : '--',
							units: 'years',
						},
					]}
				/>
			</div>
		</div>
	{/if}
</div>
