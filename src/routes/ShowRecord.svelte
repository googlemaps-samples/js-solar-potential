<script lang="ts">
	export let fields: Record<string, any>;
	export let fixed = false;
</script>

<table class="{fixed ? 'table-fixed' : 'table-auto'} w-full">
	{#each Object.keys(fields) as field}
		<tr>
			<th
				class="border border-slate-300 surface-variant on-surface-variant-text px-2 py-1 text-left"
			>
				{field}
			</th>
			<td class="border border-slate-300 surface on-surface-text px-2 py-1"
				>{fields[field].toString()}</td
			>
		</tr>
	{/each}
</table>
