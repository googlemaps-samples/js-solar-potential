<script lang="ts">
	export let options: any[] | Record<any, any>;
	export let value: any;
	export let expandTop = false;
	export let onChange: (x: any) => void = () => {};

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
			<div></div>
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
