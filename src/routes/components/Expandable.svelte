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
	import { slide } from 'svelte/transition';

	export let title: string;
	export let subtitle = '';
	export let subtitle2 = '';
	export let icon = '';
	export let section = '';
	export let secondary = false;

	const titleText = secondary ? 'secondary-text' : 'primary-text';

	function toggle() {
		section = section == title ? '' : title;
	}
</script>

<button class="flex flex-row w-full p-4" on:click={toggle}>
	<md-icon class={`${titleText} w-12`}>{icon}</md-icon>
	<div class="w-full grid justify-items-start text-left">
		<p class={`${titleText} body-large`}><b>{title}</b></p>
		<p class="label-medium outline-text">{subtitle}</p>
		<p class="label-medium outline-text">{subtitle2}</p>
	</div>
	<md-standard-icon-button>
		<md-icon>{section == title ? 'expand_less' : 'expand_more'}</md-icon>
	</md-standard-icon-button>
</button>

{#if section == title}
	<div class="px-4 pb-6" transition:slide={{ duration: 200 }}>
		<slot />
	</div>
{/if}
