<script lang="ts">
	import type { Layer } from '../layer';

	export let animationElement: HTMLElement;
	export let animationFrame: number = 0;
	export let overlays: google.maps.GroundOverlay[];
	export let layer: Layer;
	export let map: google.maps.Map;
	export let month: number;
	export let day: number;

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
</script>

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
