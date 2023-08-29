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
	export let icon: string;
	export let title: string;
	export let label: string;
	export let value: number;
	export let labelSuffix = '';
	export let min = 0.0;
	export let max = 1.0;
</script>

<div class="grid place-items-center">
	<p class="p-2 body-large">{title}</p>
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
