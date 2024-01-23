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
  import InputNumber from './InputNumber.svelte';

  export let icon: string;
  export let label: string;
  export let value = 0;
  export let decrease = false;
  export let prefix: string | undefined = undefined;
  export let suffix: string | undefined = '%';
  export let onChange: (x: number) => void = () => {};
</script>

<InputNumber
  bind:value
  {icon}
  {label}
  {prefix}
  {suffix}
  put={(x) =>
    ((decrease ? 1 - x : x - 1) * 100).toLocaleString(undefined, {
      maximumSignificantDigits: 2,
    })}
  get={(x) => (decrease ? 1 - x / 100 : x / 100 + 1)}
  {onChange}
/>

<!-- get={(x) => 1 + (x / 100) * direction} -->
