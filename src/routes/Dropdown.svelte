<script lang="ts">
	export let options: any[] | Record<any, any>;
	export let value: any;
	export let onChange: (x: any) => void = () => {};

	let opened = false;
</script>

<div class="relative">
	<div class="flex flex-row">
		<md-outlined-button
			class="w-full"
			trailing-icon
			role="button"
			tabindex={0}
			on:click={() => (opened = !opened)}
			on:keyup={undefined}
		>
			{value ? options[value] : 'Choose an option'}
			<md-icon slot="icon">{opened ? 'expand_less' : 'expand_more'}</md-icon>
		</md-outlined-button>
	</div>

	{#if opened}
		<div class="surface on-surface-text absolute w-full p-2 rounded-lg shadow-xl z-10">
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
		background-color: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
	}
	.dropdown-item:hover {
		background-color: var(--md-sys-color-secondary);
		color: var(--md-sys-color-on-secondary);
	}
</style>
