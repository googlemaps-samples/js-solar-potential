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
  import '../app.css';
  import '../theme/theme.css';
  import '../lib/material-web-imports';

  // https://kit.svelte.dev/docs/configuration#version
  import { beforeNavigate } from '$app/navigation';
  import { updated } from '$app/stores';

  beforeNavigate(({ willUnload, to }) => {
    if ($updated && !willUnload && to?.url) {
      location.href = to.url.href;
    }
  });
</script>

<svelte:head>
  <title>Solar API demo</title>
  <meta name="description" content="Solar API demo" />
</svelte:head>

<main class="surface on-surface-text body-medium flex flex-col w-screen h-screen">
  <slot />
</main>
