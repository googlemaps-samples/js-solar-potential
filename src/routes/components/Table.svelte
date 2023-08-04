<script lang="ts">
	export let rows: { name: string; value: any; units?: string; icon?: string }[] = [];
</script>

<table class="table-auto w-full body-medium">
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
