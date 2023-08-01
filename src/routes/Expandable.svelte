<script lang="ts">
	import { slide } from 'svelte/transition';

	export let title: string;
	export let subtitle: string = '';
	export let section = '';

	function toggle() {
		section = section == title ? '' : title;
	}
</script>

<div class="p-4 flex flex-row">
	<div>
		<span class="block body-large">{title}</span>
		<span class="block label-medium ml-6 on-surface-variant-text">{subtitle}</span>
	</div>
	<div class="grow" />
	<md-standard-icon-button role={undefined} on:click={toggle}>
		<md-icon>{section == title ? 'expand_less' : 'expand_more'}</md-icon>
	</md-standard-icon-button>
</div>

{#if section == title}
	<div class="px-4 pb-6" transition:slide={{ duration: 200 }}>
		<slot />
	</div>
{/if}
