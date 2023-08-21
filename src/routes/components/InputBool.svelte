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

<label for={label} class="p-2 relative inline-flex items-center cursor-pointer">
	<md-switch id={label} role={undefined} selected={value} on:click={onClick} />
	<span class="ml-3 body-large">{label}</span>
</label>
