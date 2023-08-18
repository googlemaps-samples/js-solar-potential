<script lang="ts">
	import type { MdSwitch } from '@material/web/switch/switch';

	export let label: string;
	export let value: boolean = false;
	export let onChange: (value: boolean) => void = () => {};

	function onClick(event: Event) {
		const target = event.target as MdSwitch;
		value = target.selected;
		onChange(value);
	}
</script>

<label for="switch" class="p-2 relative inline-flex items-center cursor-pointer">
	<md-switch id="switch" role={undefined} selected={value} on:click={onClick} />
	<span class="ml-3 body-large">{label}</span>
</label>
