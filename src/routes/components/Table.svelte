<!--
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 -->

<script lang="ts">
	export let rows: { name: string; value: string; units?: string; icon?: string }[] = [];
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
