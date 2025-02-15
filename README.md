# ☀️ Solar Potential demo

> _This is not an officially supported Google product._

The [Solar API](https://developers.google.com/maps/documentation/solar/overview)
offers many benefits to solar marketplace websites, solar installers, and solar SaaS designers.

This is a demo app that showcases and displays the information from the Solar API into a map.

## Before you begin

You need a Google Cloud project with a billing account and the Maps JavaScript API and Solar API enabled.

To learn more, see [Set up in Cloud Console](https://developers.google.com/maps/documentation/javascript/cloud-setup).

Additionally, you need a development environment with [Node.js](https://nodejs.org/en) installed.

## Google Maps API key

This app requires a Google Maps API key to work, follow the [Use API Keys](https://developers.google.com/maps/documentation/javascript/get-api-key) guide to create a new one.

Once you have your API key, update the [`.env`](.env) file with your key.

```sh
VITE_GOOGLE_MAPS_API_KEY="My Google Maps API key"
```

## Running the app

First, run `npm install` to install the required dependencies.

### Developer mode

To start the app in developer mode, this allows hot-reloads.
This means that every time you change a file, the app reloads itself automatically.

```sh
# Run in developer mode.
npm run dev
```

### Production mode

Starting in developer mode enables a lot of useful tools while developing, but for a production version we first need to build the app.

```sh
# Build the app.
npm run build

# Start the app.
npm run start
```

## Deploying to Cloud Run

One option to deploy your app is with [Cloud Run](https://cloud.google.com/run).
It's easy to use and allows us to build and deploy scalable containerized apps written in any language on a fully managed platform.

For some languages like Node.js, it infers the configuration and can [deploy from source directly](https://cloud.google.com/run/docs/deploying-source-code), without any additional configurations!
This uploads your source, builds it with [Cloud Build](https://cloud.google.com/build), deploys it to Cloud Run, and starts the service with `npm run start`.
All with a single command.

```sh
# Choose the Cloud location to deploy the app.
export LOCATION="us-central1"

# Build and deploy the app from source.
gcloud run deploy "solar-potential" \
  --source="." \
  --region="$LOCATION" \
  --allow-unauthenticated
```

## Checking your code

You can use `npm run check` to do type checking and check for other common issues.
You can also use `npm run check:watch` to continuously check your code when you save your changes.

To check for styling and formatting issues, you can use `npm run lint`.
To fix any lint issues, use `npm run format` to automatically format all the code base.

## Tech stack

- [Solar API](https://developers.google.com/maps/documentation/solar/overview): Get solar panel configurations, solar potential, and data layers.
- [Google Maps](https://developers.google.com/maps/documentation/javascript/overview): Display a custom map with the Google Maps JavaScript API.
- [Material Desgin 3](https://m3.material.io): Material Design 3 [web components](https://github.com/material-components/material-web#readme).
- [SvelteKit](https://kit.svelte.dev): Compiler framework to develop declarative reactive web apps with [TypeScript](https://www.typescriptlang.org).
- [Vite](https://vite.dev): Build tool with a fast development experience for modern web projects.
- [Tailwind](https://tailwindcss.com): CSS framework for design and styling.
- [ESLint](https://eslint.org): Statically analyze code to quickly find problems.
- [Prettier](https://prettier.io): Opinionated code formatter.
