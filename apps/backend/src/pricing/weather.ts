import { Weather, type GeoPoint } from '@sahayo/shared';

/**
 * Where the weather term of a fare comes from.
 *
 * The demo uses a FIXED value, on purpose. A surge multiplier that changes because it
 * stopped raining in Patna halfway through the judging is a bug you find on stage.
 * The live provider is written, commented out, behind the same interface: swapping it
 * in is one line in `weatherProvider` below.
 */
export interface WeatherProvider {
  current(point: GeoPoint): Promise<Weather>;
}

/** What the demo prices against: monsoon rain, as Patna in September usually is. */
export const DEMO_WEATHER: Weather = Weather.RAIN;

export const demoWeatherProvider: WeatherProvider = {
  async current() {
    return DEMO_WEATHER;
  },
};

/*
 * The live provider. Needs OPENWEATHER_API_KEY in the environment and a network the
 * venue may not have, which is why it is not the default.
 *
 * export const openWeatherProvider: WeatherProvider = {
 *   async current(point) {
 *     const url = `https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lng}&appid=${process.env.OPENWEATHER_API_KEY}`;
 *     const body = (await (await fetch(url)).json()) as { weather?: Array<{ main: string }>; rain?: { '1h'?: number } };
 *     const main = body.weather?.[0]?.main;
 *     if (main === 'Thunderstorm' || (body.rain?.['1h'] ?? 0) > 7.5) return Weather.HEAVY_RAIN;
 *     if (main === 'Rain' || main === 'Drizzle') return Weather.RAIN;
 *     if (main === 'Clouds') return Weather.CLOUDY;
 *     return Weather.CLEAR;
 *   },
 * };
 */

export const weatherProvider: WeatherProvider = demoWeatherProvider;
