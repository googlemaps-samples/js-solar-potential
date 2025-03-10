/*
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
 */

import axios from 'axios';

const weatherApiUrl = 'https://api.openweathermap.org/data/2.5/weather';

export async function fetchWeatherData(lat: number, lon: number, apiKey: string) {
  try {
    const response = await axios.get(weatherApiUrl, {
      params: {
        lat: lat,
        lon: lon,
        appid: apiKey,
        units: 'metric',
      },
    });

    const data = response.data;
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      cloudCover: data.clouds.all,
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}
