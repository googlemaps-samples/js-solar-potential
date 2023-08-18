<script lang="ts">
	import NumberInput from './InputNumber.svelte';

	export let icon: string;
	export let label: string;
	export let value: number = 0;
	export let prefix = '$';
	export let suffix: string | undefined = undefined;
	export let precision = 2;
	export let onChange: (x: number) => void = () => {};
</script>

<NumberInput
	bind:value
	min={0}
	{icon}
	{label}
	{suffix}
	{prefix}
	put={(x) => x.toFixed(precision)}
	{onChange}
/>
