<script lang="ts">
	import Table from './Table.svelte';

	export let title: string = '';
	export let icon: string = '';
	export let rows: { name: string; value: any; units?: string; icon?: string }[] = [];
</script>

<div class="grid justify-items-start surface on-surface-text p-4 rounded-lg shadow-lg">
	<div class="flex items-center primary-text">
		<md-icon class="w-8">{icon}</md-icon>
		<p class="body-large"><b>{title}</b></p>
	</div>
	<div class="py-3 w-full">
		<md-divider />
	</div>
	<div class="w-full secondary-text">
		<Table {rows} />
	</div>
	<div class="px-3">
		<slot />
	</div>
</div>
