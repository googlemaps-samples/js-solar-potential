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
