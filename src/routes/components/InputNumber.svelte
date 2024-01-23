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
  import type { MdOutlinedTextField } from '@material/web/textfield/outlined-text-field';

  export let icon: string;
  export let label: string;
  export let value = 0;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let prefix: string | undefined = undefined;
  export let suffix: string | undefined = undefined;
  export let put: (x: number) => string = (x) => x.toString();
  export let get: (x: number) => number = (x) => x;
  export let onChange: (x: number) => void = () => {};

  function _onChange(event: Event) {
    const target = event.target as MdOutlinedTextField;
    value = get(Number(target.value));
    onChange(value);
  }
</script>

<md-outlined-text-field
  type="number"
  {label}
  value={put(value)}
  {min}
  {max}
  prefix-text={prefix}
  suffix-text={suffix}
  on:change={_onChange}
>
  <md-icon slot="leadingicon">{icon}</md-icon>
</md-outlined-text-field>
