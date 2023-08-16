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
	import type { Layer } from '../layer';

	export let animationElement: HTMLElement;
	export let frame: number;
	export let layer: Layer;
	export let month: number;
	export let day: number;

	let monthFrame = 0;
	$: monthFrame = frame % 12;
	let hourFrame = 0;
	$: hourFrame = frame % 24;

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
				value-start={monthFrame}
				value-end={monthFrame}
				on:change={(event) => {
					if (event.target.valueStart != frame) {
						frame = event.target.valueStart;
						event.target.valueStart = frame;
					} else {
						frame = event.target.valueEnd;
						event.target.valueEnd = frame;
					}
				}}
			/>
			<span class="w-8">{monthNames[frame % 12]}</span>
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
				value-start={hourFrame}
				value-end={hourFrame}
				on:change={(event) => {
					if (event.target.valueStart != frame) {
						frame = event.target.valueStart;
						event.target.valueStart = frame;
					} else {
						frame = event.target.valueEnd;
						event.target.valueEnd = frame;
					}
				}}
			/>
			<span class="w-24 whitespace-nowrap">
				{monthNames[month]}
				{day},
				{#if hourFrame == 0}
					12am
				{:else if hourFrame < 10}
					{hourFrame}am
				{:else if hourFrame < 12}
					{hourFrame}am
				{:else if hourFrame == 12}
					12pm
				{:else if hourFrame < 22}
					{hourFrame - 12}pm
				{:else}
					{hourFrame - 12}pm
				{/if}
			</span>
		</div>
	{/if}
</div>
