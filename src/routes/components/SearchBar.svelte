<script lang="ts">
	import type { MdFilledTextField } from '@material/web/textfield/filled-text-field';
	import { onMount } from 'svelte';

	export let input: HTMLInputElement;
	export let label = 'Search an address';

	let textFieldElement: MdFilledTextField;
	onMount(() => {
		if (!input) {
			input = textFieldElement.renderRoot.querySelector('.input') as HTMLInputElement;
		}
	});
</script>

<md-filled-text-field bind:this={textFieldElement} {label}>
	<md-icon slot="leadingicon">search</md-icon>
</md-filled-text-field>
