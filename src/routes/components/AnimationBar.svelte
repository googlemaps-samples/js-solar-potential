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
	import type { MdSlider } from '@material/web/slider/slider';
	import type { Layer } from '../layer';

	export let layer: Layer;
	export let month: number;
	export let day: number;
	export let hour: number;

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

	function onChange(event: Event) {
		const target = event.target as MdSlider;
		switch (layer.id) {
		}

		// if (target.valueStart != tick) {
		// 	tick = target.valueStart ?? 0;
		// 	target.valueStart = tick;
		// } else {
		// 	tick = target.valueEnd ?? 0;
		// 	target.valueEnd = tick;
		// }
	}
</script>

<div class="mb-5 p-2 lg:w-96 w-80">
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
				value-start={tick % 12}
				value-end={tick % 12}
				on:change={onChange}
			/>
			<span class="w-8">{monthNames[tick % 12]}</span>
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
				value-start={tick % 24}
				value-end={tick % 24}
				on:change={onChange}
			/>
			<span class="w-24 whitespace-nowrap">
				{monthNames[month]}
				{day},
				{#if tick % 24 == 0}
					12am
				{:else if tick % 24 < 10}
					{tick % 24}am
				{:else if tick % 24 < 12}
					{tick % 24}am
				{:else if tick % 24 == 12}
					12pm
				{:else if tick % 24 < 22}
					{(tick % 24) - 12}pm
				{:else}
					{(tick % 24) - 12}pm
				{/if}
			</span>
		</div>
	{/if}
</div>
