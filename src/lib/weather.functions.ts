import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Open-Meteo: free, keyless weather + geocoding API.
const WMO: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
};

export type WeatherResult =
  | { ok: true; location: string; latitude: number; longitude: number; temperatureC: number; humidity: number;
      precipitationMm: number; condition: string; isRaining: boolean; source: string; fetchedAt: string }
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
      let lat = data.latitude, lon = data.longitude, name = data.location ?? "";
      if (lat == null || lon == null) {
        if (!data.location) return { ok: false, error: "Enter a city name." };
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(data.location)}`);
        if (!g.ok) return { ok: false, error: "Location service unavailable." };
        const gj = (await g.json()) as { results?: { latitude: number; longitude: number; name: string; country?: string }[] };
        const r = gj.results?.[0];
        if (!r) return { ok: false, error: `Couldn't find "${data.location}".` };
        lat = r.latitude; lon = r.longitude; name = `${r.name}${r.country ? `, ${r.country}` : ""}`;
      }
      const w = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code`,
      );
      if (!w.ok) return { ok: false, error: "Weather service unavailable." };
      const wj = (await w.json()) as { current: { temperature_2m: number; relative_humidity_2m: number; precipitation: number; rain: number; weather_code: number; time: string } };
      const c = wj.current;
      const code = c.weather_code;
      return {
        ok: true, location: name, latitude: lat, longitude: lon,
        temperatureC: Math.round(c.temperature_2m * 10) / 10, humidity: c.relative_humidity_2m,
        precipitationMm: c.precipitation, condition: WMO[code] ?? "Unknown",
        isRaining: c.rain > 0 || (code >= 51 && code <= 82) || code >= 95,
        source: "Open-Meteo", fetchedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.error("weather failed", e);
      return { ok: false, error: "Weather service unavailable. Use manual weather instead." };
    }
  });
