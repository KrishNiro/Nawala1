export const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=7.0544&longitude=80.5346&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FColombo';

// Reuse a successful result for ten minutes to reduce requests to the provider.
export function createWeatherLoader(fetchWeather = fetch) {
  let cached;
  let savedAt = 0;
  return async function getWeather() {
    if (cached && Date.now() - savedAt < 600000) return cached;
    const response = await fetchWeather(weatherUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
    const data = await response.json();
    const current = data.current;
    if (!current || !['temperature_2m', 'apparent_temperature', 'weather_code', 'wind_speed_10m'].every(key => Number.isFinite(current[key]))) {
      throw new Error('Weather response has missing measurements');
    }
    cached = current;
    savedAt = Date.now();
    return current;
  };
}
