<script lang="ts">
	import type { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field';

	export let icon: string;
	export let label: string;
	export let value = 0;
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let prefix: string | undefined = undefined;
	export let suffix: string | undefined = undefined;
	export let put: (x: number) => string = (x) => x.toString();
	export let get: (x: number) => number = (x) => x;
	export let onChange: (x: number) => void = () => {};

	function _onChange(event: Event) {
		const target = event.target as MdOutlinedTextField;
		value = get(Number(target.value));
		onChange(value);
	}
</script>

<md-outlined-text-field
	type="number"
	{label}
	value={put(value)}
	{min}
	{max}
	prefix-text={prefix}
	suffix-text={suffix}
	on:change={_onChange}
>
	<md-icon slot="leadingicon">{icon}</md-icon>
</md-outlined-text-field>
