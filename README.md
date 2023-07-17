# ☀️ Solar potential demo

## Before you begin

[Set up Maps API](https://console.cloud.google.com/google/maps-apis/start)

Enable the APIs:
- Map tiles: `tile.googleapis.com`

```sh
npm install
```

Create a `.env` file with the environment variables.

```sh
# .env
VITE_GOOGLE_MAPS_API_KEY="Your Google Maps API key"
VITE_CESIUM_API_KEY="Your Cesium ION key"
```

## Run locally

```sh
npm run dev
```

## Deploy in Cloud Run

[Deploy from a git repo](https://cloud.google.com/run/docs/quickstarts/deploy-continuously#deploy-from-repo)

[Deploy from source code](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)

```sh
export GOOGLE_MAPS_API_KEY="Your Google Maps API key"
export CESIUM_API_KEY="Your Cesium ion API key"

export LOCATION="us-central1"

gcloud run deploy "solar-potential" \
  --source="." \
  --region="$LOCATION" \
  --allow-unauthenticated
```