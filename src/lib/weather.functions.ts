import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type WeatherResult =
  | { ok: true; location: string; latitude: number; longitude: number; temperatureC: number; humidity: number;
      precipitationMm: number; condition: string; isRaining: boolean; windKph: number; rainChance: number;
      icon: string; source: string; fetchedAt: string }
  | { ok: false; error: string };

export const getWeather = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      location: z.string().trim().min(1).max(100).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<WeatherResult> => {
    try {
      const apiKey = process.env["WEATHERAPI_API_KEY"];
      if (!apiKey) return { ok: false, error: "Live weather is not configured. You can still enter weather manually." };
      const query = data.latitude != null && data.longitude != null
        ? `${data.latitude},${data.longitude}`
        : data.location?.trim();
      if (!query) return { ok: false, error: "Enter a city name." };
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&days=1&aqi=no&alerts=no`,
        { signal: AbortSignal.timeout(10000) },
      );
      const payload = await response.json() as {
        error?: { message?: string };
        location?: { name: string; region: string; country: string; lat: number; lon: number };
        current?: { temp_c: number; humidity: number; precip_mm: number; wind_kph: number; condition: { text: string; icon: string } };
        forecast?: { forecastday?: { day?: { daily_chance_of_rain?: number } }[] };
      };
      if (!response.ok || !payload.current || !payload.location) {
        const message = payload.error?.message?.toLowerCase() ?? "";
        if (message.includes("no matching location") || message.includes("invalid request")) {
          return { ok: false, error: `Couldn't find "${data.location ?? "that location"}". Check the spelling and try again.` };
        }
        if (response.status === 401 || response.status === 403) return { ok: false, error: "Weather service rejected its access key. You can enter weather manually." };
        return { ok: false, error: "Weather service is unavailable. Please try again or enter weather manually." };
      }
      const c = payload.current;
      const rainChance = payload.forecast?.forecastday?.[0]?.day?.daily_chance_of_rain ?? 0;
      const condition = c.condition.text;
      const location = payload.location;
      const name = [location.name, location.region, location.country].filter(Boolean).join(", ");
      return {
        ok: true, location: name, latitude: location.lat, longitude: location.lon,
        temperatureC: c.temp_c, humidity: c.humidity, precipitationMm: c.precip_mm, condition,
        isRaining: c.precip_mm > 0 || /rain|drizzle|shower|thunder/i.test(condition) || rainChance >= 40,
        windKph: c.wind_kph, rainChance, icon: `https:${c.condition.icon}`,
        source: "WeatherAPI.com", fetchedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.error("weather failed", e);
      return { ok: false, error: "Couldn't reach the weather service. Please retry or enter weather manually." };
    }
  });
