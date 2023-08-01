<script lang="ts">
	import type { MdDialog } from '@material/web/dialog/dialog';
	import Expandable from '../Expandable.svelte';
	import ShowRecord from '../ShowRecord.svelte';
	import { showLatLng, type BuildingInsightsResponse, type RequestError, showDate } from '../solar';
	import Show from '../Show.svelte';

	export let title = '🏡 Building insights';
	export let configId: number;
	export let expandedSection: string;
	export let buildingInsightsResponse: BuildingInsightsResponse | RequestError | undefined;
	export let onRetry: () => void = () => {};

	let buildingInsightsDialog: MdDialog;

	function buildingInsightsSummary(building: BuildingInsightsResponse, configId: number) {
		const solarPotential = building.solarPotential;
		const solarConfig = solarPotential.solarPanelConfigs[configId];
		return {
			'Config ID': configId,
			'Total panels': solarConfig.panelsCount,
			Center: `${showLatLng(building.center)}`,
			'Carbon offset factor': `${solarPotential.carbonOffsetFactorKgPerMwh?.toFixed(1)} Kg/MWh`,
			'Maximum sunshine': `${solarPotential.maxSunshineHoursPerYear?.toFixed(1)} hr/year`,
			'Imagery date': `${showDate(building.imageryDate)}`
		};
	}
</script>

{#if !buildingInsightsResponse}
	<div class="grid py-8 place-items-center">
		<md-circular-progress four-color indeterminate />
	</div>
{:else if 'error' in buildingInsightsResponse}
	<div class="error-container on-error-container-text">
		<Expandable section={title} {title} subtitle={buildingInsightsResponse.error.status}>
			<div class="grid py-8 place-items-center">
				<p class="title-large">ERROR {buildingInsightsResponse.error.code}</p>
				<p class="body-medium">{buildingInsightsResponse.error.status}</p>
				<p class="label-medium">{buildingInsightsResponse.error.message}</p>
				<md-filled-button class="pt-6" role={undefined} on:click={onRetry}>
					Retry
					<md-icon slot="icon">refresh</md-icon>
				</md-filled-button>
			</div>
		</Expandable>
	</div>
{:else}
	<Expandable
		bind:section={expandedSection}
		{title}
		subtitle={`Yearly energy: ${(
			buildingInsightsResponse.solarPotential.solarPanelConfigs[configId].yearlyEnergyDcKwh / 1000
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
						buildingInsightsResponse.solarPotential.solarPanelConfigs[configId].yearlyEnergyDcKwh /
						1000
					).toFixed(2)} MWh</span
				>
			</div>
		</div>

		<ShowRecord fixed fields={buildingInsightsSummary(buildingInsightsResponse, configId)} />

		<div class="flex flex-row pt-4">
			<div class="grow" />
			<md-tonal-button role={undefined} on:click={() => buildingInsightsDialog.show()}>
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
