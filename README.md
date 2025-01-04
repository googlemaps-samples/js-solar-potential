[![Build](https://github.com/googlemaps-samples/js-solar-potential/actions/workflows/build.yml/badge.svg)](https://github.com/googlemaps-samples/js-solar-potential/actions/workflows/build.yml)
[![Tests](https://github.com/googlemaps-samples/js-solar-potential/actions/workflows/tests.yml/badge.svg)](https://github.com/googlemaps-samples/js-solar-potential/actions/workflows/tests.yml)

![Contributors](https://img.shields.io/github/contributors/googlemaps-samples/js-solar-potential?color=green)
[![License](https://img.shields.io/github/license/googlemaps-samples/js-solar-potential?color=blue)][license]
[![StackOverflow](https://img.shields.io/stackexchange/stackoverflow/t/google-maps?color=orange&label=google-maps&logo=stackoverflow)](https://stackoverflow.com/questions/tagged/google-maps)
[![Discord](https://img.shields.io/discord/676948200904589322?color=6A7EC2&logo=discord&logoColor=ffffff)][Discord server]

# ☀️ Solar Potential demo

## Description

This repository provides a sample app demonstrating use of the **[Solar API]**. The Solar API offers many benefits to solar marketplace websites, solar installers, and solar SaaS designers.

The demo app showcases and displays the information from the Solar API on a map.

## Requirements

To run the samples, you will need:

- To [sign up with Google Maps Platform]
- A Google Maps Platform [project] with the **Maps JavaScript and Solar APIs** enabled
- An [API key] associated with the project above
- Current version of Node.js and NPM

## Google Maps API key

Once you have your API key, update the [`.env`](.env) file with your key.

```sh
VITE_GOOGLE_MAPS_API_KEY="YOUR_API_KEY"
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
- [Vite](https://vitejs.dev): Build tool with a fast development experience for modern web projects.
- [Tailwind](https://tailwindcss.com): CSS framework for design and styling.
- [ESLint](https://eslint.org): Statically analyze code to quickly find problems.
- [Prettier](https://prettier.io): Opinionated code formatter.

## Contributing

Contributions are welcome and encouraged! If you'd like to contribute, send us a [pull request] and refer to our [code of conduct] and [contributing guide].

## Terms of Service

This sample uses Google Maps Platform services. Use of Google Maps Platform services through this sample is subject to the Google Maps Platform [Terms of Service].

This sample is not a Google Maps Platform Core Service. Therefore, the Google Maps Platform Terms of Service (e.g. Technical Support Services, Service Level Agreements, and Deprecation Policy) do not apply to the code in this sample.

## Support

This sample is offered via an open source [license]. It is not governed by the Google Maps Platform Support [Technical Support Services Guidelines], the [SLA], or the [Deprecation Policy]. However, any Google Maps Platform services used by the sample remain subject to the Google Maps Platform Terms of Service.

If you find a bug, or have a feature request, please [file an issue] on GitHub. If you would like to get answers to technical questions from other Google Maps Platform developers, ask through one of our [developer community channels]. If you'd like to contribute, please check the [contributing guide].

You can also discuss this sample on our [Discord server].

[Solar API]: https://developers.google.com/maps/documentation/solar
[API key]: https://developers.google.com/maps/documentation/solar/get-api-key

[code of conduct]: ?tab=coc-ov-file#readme
[contributing guide]: CONTRIBUTING
[Deprecation Policy]: https://cloud.google.com/maps-platform/terms
[developer community channels]: https://developers.google.com/maps/developer-community
[Discord server]: https://discord.gg/hYsWbmk
[file an issue]: https://github.com/googlemaps-samples/js-solar-potential/issues/new/choose
[license]: LICENSE
[pull request]: https://github.com/googlemaps-samples/js-solar-potential/compare
[project]: https://developers.google.com/maps/documentation/solar/cloud-setup#enabling-apis
[Sign up with Google Maps Platform]: https://console.cloud.google.com/google/maps-apis/start
[SLA]: https://cloud.google.com/maps-platform/terms/sla
[Technical Support Services Guidelines]: https://cloud.google.com/maps-platform/terms/tssg
[Terms of Service]: https://cloud.google.com/maps-platform/terms
