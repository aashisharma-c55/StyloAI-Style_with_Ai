// Pure rule-based outfit engine. Used directly and as the AI fallback.
import { NEUTRALS } from "./constants";

export type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  occasions: string[];
  availability_status: string;
  laundry_status: string;
};

export type WeatherInput = {
  temperatureC: number | null;
  condition?: string | null;
  isRaining?: boolean | undefined;
};

export type RecommendInput = {
  items: WardrobeItem[];
  occasion: string;
  weather: WeatherInput;
  preferredColors?: string[];
  style?: string;
  variation?: number;
};

export type RecommendResult = {
  itemIds: string[];
  missing: string[];
  explanation: string;
  weatherSuitability: string;
};

const TOPS = ["tops", "shirts", "t-shirts"];
const BOTTOMS = ["trousers", "jeans"];
const ONE_PIECE = ["dresses", "ethnic wear"];

export function isWearable(i: WardrobeItem) {
  return i.availability_status === "available" && i.laundry_status === "clean";
}

export function weatherBand(w: WeatherInput): "hot" | "warm" | "mild" | "cold" | "unknown" {
  const t = w.temperatureC;
  if (t == null || Number.isNaN(t)) return "unknown";
  if (t >= 30) return "hot";
  if (t >= 22) return "warm";
  if (t >= 15) return "mild";
  return "cold";
}

export function needsOuterwear(w: WeatherInput) {
  const band = weatherBand(w);
  return band === "cold" || band === "mild" || !!w.isRaining;
}

function score(item: WardrobeItem, ctx: RecommendInput, band: ReturnType<typeof weatherBand>) {
  let s = 0;
  const occ = ctx.occasion.toLowerCase();
  if (item.occasions.map((o) => o.toLowerCase()).includes(occ)) s += 5;
  if (occ === "college" && item.occasions.includes("casual")) s += 2;
  if ((occ === "formal" || occ === "wedding") && item.category === "t-shirts") s -= 4;
  if (item.season === "all") s += 1;
  if (band === "hot" || band === "warm") {
    if (item.season === "summer") s += 3;
    if (item.season === "winter") s -= 4;
  }
  if (band === "cold") {
    if (item.season === "winter") s += 3;
    if (item.season === "summer") s -= 2;
  }
  if (ctx.weather.isRaining && item.season === "monsoon") s += 2;
  if (ctx.preferredColors?.map((c) => c.toLowerCase()).includes(item.color.toLowerCase())) s += 3;
  if (NEUTRALS.includes(item.color.toLowerCase())) s += 1;
  return s;
}

function pick(cands: WardrobeItem[], ctx: RecommendInput, band: ReturnType<typeof weatherBand>, offset: number) {
  if (cands.length === 0) return undefined;
  const ranked = [...cands].sort((a, b) => score(b, ctx, band) - score(a, ctx, band) || a.id.localeCompare(b.id));
  return ranked[offset % ranked.length];
}

/** Two colors pair well if either is neutral or they match. */
export function colorsCompatible(a: string, b: string) {
  const x = a.toLowerCase(), y = b.toLowerCase();
  return x === y || NEUTRALS.includes(x) || NEUTRALS.includes(y);
}

export function recommendOutfit(ctx: RecommendInput): RecommendResult {
  const band = weatherBand(ctx.weather);
  const pool = ctx.items.filter(isWearable);
  const v = ctx.variation ?? 0;
  const of = (cats: string[]) => pool.filter((i) => cats.includes(i.category));
  const missing: string[] = [];
  const chosen: WardrobeItem[] = [];

  const tops = of(TOPS), bottoms = of(BOTTOMS), onePieces = of(ONE_PIECE);
  const preferOnePiece =
    onePieces.length > 0 &&
    (tops.length === 0 || bottoms.length === 0 || ["wedding", "party"].includes(ctx.occasion.toLowerCase()) || v % 3 === 2);

  if (preferOnePiece) {
    chosen.push(pick(onePieces, ctx, band, v)!);
  } else {
    const top = pick(tops, ctx, band, v);
    if (!top) missing.push("a top, shirt or T-shirt");
    else chosen.push(top);
    const compatibleBottoms = top ? bottoms.filter((b) => colorsCompatible(b.color, top.color)) : bottoms;
    const bottom = pick(compatibleBottoms.length ? compatibleBottoms : bottoms, ctx, band, Math.floor(v / 2));
    if (!bottom) missing.push("trousers or jeans");
    else chosen.push(bottom);
  }

  const shoes = pick(of(["footwear"]), ctx, band, v);
  if (shoes) chosen.push(shoes);
  else missing.push("footwear");

  if (needsOuterwear(ctx.weather)) {
    const jacket = pick(of(["jackets"]), ctx, band, v);
    if (jacket) chosen.push(jacket);
    else missing.push(ctx.weather.isRaining ? "a rain-suitable jacket" : "a jacket for cooler weather");
  }

  const acc = pick(of(["accessories"]), ctx, band, v);
  if (acc && ["formal", "party", "wedding"].includes(ctx.occasion.toLowerCase())) chosen.push(acc);

  const weatherSuitability =
    band === "unknown"
      ? "No temperature provided — picked versatile pieces."
      : `${band.charAt(0).toUpperCase() + band.slice(1)} weather (${ctx.weather.temperatureC}°C${ctx.weather.isRaining ? ", rain" : ""}).`;

  const explanation = chosen.length
    ? `Chosen for ${ctx.occasion}: ${chosen.map((c) => `${c.color} ${c.name}`).join(", ")}. Items were ranked by occasion fit, season, your colour preferences and neutral pairing.`
    : "Not enough available clean clothing to build an outfit.";

  return { itemIds: chosen.map((c) => c.id), missing, explanation, weatherSuitability };
}
