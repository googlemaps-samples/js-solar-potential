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
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export let key: any = undefined;
  export let value: any;
  export let maxLength = 40;

  export let label = '';
  export let collapsed = false;

  let expanded = false;
  function toggle() {
    expanded = !expanded;
  }

  let summary: string = JSON.stringify(value);
  if (summary?.length >= maxLength) {
    summary = summary.substring(0, maxLength) + '...';
  }

  let items: { k: any; v: any }[];
  if (Array.isArray(value)) {
    items = value.map((v, i) => ({ k: i, v: v }));
  } else if (typeof value === 'object' && value !== null) {
    items = Object.keys(value).map((k) => ({ k: k, v: value[k] }));
  }
</script>

<div class="flex flex-col font-mono whitespace-nowrap">
  <div class="flex flex-row w-full">
    {#if collapsed && items !== undefined}
      <button on:click={toggle}>
        <md-icon>{expanded ? 'arrow_drop_down' : 'arrow_right'}</md-icon>
      </button>
    {:else}
      <div><md-icon>&nbsp;</md-icon></div>
    {/if}

    {#if key !== undefined}
      <span class="font-bold">{key}:&nbsp;</span>
    {/if}

    {#if label}
      <span>{label}</span>
    {:else if ['number', 'string', 'boolean', 'undefined'].includes(typeof value)}
      <span>{value}</span>
    {:else if value === null}
      <span>{value}</span>
    {:else if Array.isArray(value)}
      <span class="font-sans italic">({value.length}) {summary}</span>
    {:else}
      <span class="font-sans italic">{summary}</span>
    {/if}
  </div>

  {#if !collapsed || expanded}
    <div class="flex flex-col ml-8 pb-6 max-h-72 overflow-auto">
      {#if Array.isArray(value)}
        <span class="italic">length: {value.length}</span>
      {/if}
      <div
        style={collapsed
          ? 'border-left: solid; border-color: var(--md-sys-color-outline-variant);'
          : ''}
      >
        {#each items as { k, v }}
          <svelte:self key={k} value={v} collapsed={true} />
        {/each}
      </div>
    </div>
  {/if}
</div>
