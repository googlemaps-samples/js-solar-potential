<script lang="ts">
	import InputNumber from './InputNumber.svelte';

	export let icon: string;
	export let label: string;
	export let value = 0;
	export let decrease = false;
	export let prefix: string | undefined = undefined;
	export let suffix: string | undefined = '%';
	export let onChange: (x: number) => void = () => {};
</script>

<InputNumber
	bind:value
	{icon}
	{label}
	{prefix}
	{suffix}
	put={(x) =>
		((decrease ? 1 - x : x - 1) * 100).toLocaleString(undefined, {
			maximumSignificantDigits: 2,
		})}
	get={(x) => (decrease ? 1 - x / 100 : x / 100 + 1)}
	{onChange}
/>

<!-- get={(x) => 1 + (x / 100) * direction} -->
