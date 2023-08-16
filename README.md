# ☀️ Solar Potential demo

> _This is not an officially supported Google product._

## Tech stack

* [SvelteKit](https://kit.svelte.dev): Compiler framework to develop reactive web apps in a declarative style.
* [Vite](https://vitejs.dev): Build tool with a fast development experience for modern web projects.
* [Material Desgin 3](https://m3.material.io): Material Design 3 [web components](https://github.com/material-components/material-web#readme).
* [Tailwind](https://tailwindcss.com): CSS framework for design and styling.
* [TypeScript](https://www.typescriptlang.org): Provides type checking and type inference for JavaScript.

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Deploying

```sh
export LOCATION="us-central1"

gcloud run deploy "solar-potential" \
  --source="." \
  --region="$LOCATION" \
  --allow-unauthenticated
```
