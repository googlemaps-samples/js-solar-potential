<script lang="ts">
	import InputNumber from './InputNumber.svelte';

	export let icon: string;
	export let label: string;
	export let value = 0;
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
	put={(x) => (x * 100).toLocaleString(undefined, { maximumSignificantDigits: 2 })}
	get={(x) => x / 100}
	{onChange}
/>
