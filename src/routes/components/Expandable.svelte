<script lang="ts">
	import { slide } from 'svelte/transition';

	export let title: string;
	export let subtitle = '';
	export let subtitle2 = '';
	export let icon = '';
	export let section = '';
	export let secondary = false;

	const titleText = secondary ? 'secondary-text' : 'primary-text';

	function toggle() {
		section = section == title ? '' : title;
	}
</script>

<button class="flex flex-row w-full p-4" on:click={toggle}>
	<md-icon class={`${titleText} w-12`}>{icon}</md-icon>
	<div class="w-full grid justify-items-start text-left">
		<p class={`${titleText} body-large`}><b>{title}</b></p>
		<p class="label-medium outline-text">{subtitle}</p>
		<p class="label-medium outline-text">{subtitle2}</p>
	</div>
	<md-standard-icon-button>
		<md-icon>{section == title ? 'expand_less' : 'expand_more'}</md-icon>
	</md-standard-icon-button>
</button>

{#if section == title}
	<div class="px-4 pb-6" transition:slide={{ duration: 200 }}>
		<slot />
	</div>
{/if}
