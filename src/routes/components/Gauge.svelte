<script lang="ts">
	export let icon: string;
	export let label: string;
	export let value: number;
	export let labelSuffix = '';
	export let min = 0.0;
	export let max = 1.0;
</script>

<div class="grid place-items-center">
	<p class="p-2 body-large">Panels count</p>
	<div class="relative" style="width: 72px; height: 72px">
		<md-circular-progress {value} {min} {max} style="--md-circular-progress-size: 72px;" />
		<md-icon-button class="absolute inset-0 m-auto">
			<md-icon class="primary-text">{icon}</md-icon>
		</md-icon-button>
	</div>
	<p class="p-2 body-medium">
		<span class="primary-text">
			<b>{label}</b>
		</span>
		<span>{labelSuffix}</span>
	</p>
</div>
