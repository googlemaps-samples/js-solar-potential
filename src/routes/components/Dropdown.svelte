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
	export let options: Record<string, string>;
	export let value: string;
	export let expandTop = false;
	export let onChange: (x: string) => void = () => {};

	let opened = false;
</script>

<div class="relative">
	<md-outlined-button
		class="w-full"
		trailing-icon
		role={undefined}
		on:click={() => (opened = !opened)}
	>
		<div class="flex items-center">
			{value !== undefined ? options[value] : 'Choose an option'}
			<md-icon slot="icon">{opened ? 'expand_less' : 'expand_more'}</md-icon>
		</div>
	</md-outlined-button>

	{#if opened}
		<div
			class="fixed top-0 left-0 w-full h-full z-10"
			role={undefined}
			on:click={() => (opened = false)}
		/>

		<div
			class={`surface-variant on-surface-variant-text absolute ${
				expandTop ? 'bottom-full' : ''
			} w-full p-2 rounded-lg shadow-xl z-20`}
		>
			<div />
			{#each Object.keys(options) as option}
				<button
					class="dropdown-item block px-4 py-2 w-full text-left rounded"
					on:click={() => {
						value = option;
						opened = false;
						onChange(value);
					}}
				>
					{options[option]}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown-item {
		background-color: var(--md-sys-color-surface-variant);
		color: var(--md-sys-color-on-surface);
	}
	.dropdown-item:hover {
		background-color: var(--md-sys-color-secondary);
		color: var(--md-sys-color-on-secondary);
	}
</style>
