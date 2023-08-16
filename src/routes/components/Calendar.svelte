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
	import Dropdown from './Dropdown.svelte';

	export let month: number;
	export let day: number;
	export let numCols = 7;
	export let onChange: (month: number, day: number) => void = () => {};

	let opened = false;

	const months: Record<string, number> = {
		January: 31,
		February: 28,
		March: 31,
		April: 30,
		May: 31,
		June: 30,
		July: 31,
		August: 31,
		September: 30,
		October: 31,
		November: 30,
		December: 31,
	};

	function dayFrom(row: number, col: number) {
		return row * numCols + col + 1;
	}

	function monthDays(month: number) {
		return months[Object.keys(months)[month]];
	}
</script>

<div class="relative">
	<md-text-button class="w-full" trailing-icon role={undefined} on:click={() => (opened = !opened)}>
		<div class="flex items-center">
			<md-icon>event</md-icon>
			<span>&nbsp; {Object.keys(months)[month]} {day}</span>
		</div>
	</md-text-button>

	{#if opened}
		<div
			class="fixed top-0 left-0 w-full h-full z-10"
			role={undefined}
			on:click={() => (opened = false)}
		/>

		<div
			class="surface-variant on-surface-variant-text absolute right-4 w-auto p-4 rounded-lg shadow-lg z-20"
		>
			<div class="px-4 pb-4">
				<Dropdown
					bind:value={month}
					options={Object.keys(months)}
					onChange={() => onChange(month, day)}
				/>
			</div>

			<table>
				{#each [...Array(Math.ceil(monthDays(month) / numCols)).keys()] as row}
					<tr>
						{#each [...Array(numCols).keys()] as col}
							<td>
								{#if day == dayFrom(row, col)}
									<button
										class="primary on-primary-text relative w-8 h-8 rounded-full"
										on:click={() => {
											opened = false;
										}}
									>
										<md-ripple />
										{dayFrom(row, col)}
									</button>
								{:else}
									<button
										class="relative w-8 h-8 rounded-full"
										on:click={() => {
											day = dayFrom(row, col);
											opened = false;
											onChange(month, day);
										}}
									>
										<md-ripple />
										{dayFrom(row, col)}
									</button>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</table>
		</div>
	{/if}
</div>
