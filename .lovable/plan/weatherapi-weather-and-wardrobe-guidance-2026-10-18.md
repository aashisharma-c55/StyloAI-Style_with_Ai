# WeatherAPI weather and wardrobe guidance

## Build
- Replace the current Open-Meteo weather fetch with a secure WeatherAPI.com current/forecast lookup, using the stored API key only in the server function.
- Extend the existing weather view in outfit recommendations with humidity, wind, rain forecast, city search, refresh, and clear loading/error states.
- Use the existing wardrobe and weather-aware recommendation flow to favor clothing suited to temperature and rainy conditions without changing other site features.
- Update settings copy to reflect WeatherAPI and keep the selected city behavior.

## Technical details
- Use the existing authenticated TanStack server function and validated input; call WeatherAPI via `fetch` without adding a package.
- Add focused tests for temperature-band thresholds and rain-sensitive recommendation ranking, then verify the weather server function and live preview where credentials permit.
