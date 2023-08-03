<script lang="ts">
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
	<table class="table-auto w-full body-medium secondary-text">
		{#each rows as row}
			<tr>
				<td class="primary-text py-2">
					<md-icon>{row.icon ?? ''}</md-icon>
				</td>
				<th class="pl-2 text-left">
					{row.name}
				</th>
				<td class="pl-2 text-right">
					<span>{row.value.toString()}</span>
					<span class="body-small">{row.units ?? ''}</span>
				</td>
			</tr>
		{/each}
	</table>
	<div class="px-3">
		<slot />
	</div>
</div>
