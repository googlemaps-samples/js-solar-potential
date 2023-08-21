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
	import NumberInput from './InputNumber.svelte';

	export let icon: string;
	export let label: string;
	export let value: number = 0;
	export let prefix = '$';
	export let suffix: string | undefined = undefined;
	export let precision = 2;
	export let onChange: (x: number) => void = () => {};
</script>

<NumberInput
	bind:value
	min={0}
	{icon}
	{label}
	{suffix}
	{prefix}
	put={(x) => x.toFixed(precision)}
	{onChange}
/>
