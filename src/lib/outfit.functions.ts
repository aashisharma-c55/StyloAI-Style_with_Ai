import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { recommendOutfit, isWearable, type WardrobeItem } from "./recommend";

const Input = z.object({
  occasion: z.string().trim().min(1).max(50),
  temperatureC: z.number().min(-50).max(60).nullable(),
  condition: z.string().max(80).nullable().optional(),
  isRaining: z.boolean().optional(),
  preferredColors: z.array(z.string().max(30)).max(10).default([]),
  style: z.string().max(100).optional(),
  comfort: z.string().max(200).optional(),
  variation: z.number().int().min(0).max(1000).default(0),
  useAi: z.boolean().default(true),
});

export type OutfitResponse = {
  source: "ai" | "rule_based";
  itemIds: string[];
  explanation: string;
  stylingTips: string;
  weatherSuitability: string;
  missing: string[];
  alternatives: string[][];
  notice?: string | undefined;
};

// Gemini response schema (OpenAPI subset: no additionalProperties).
const geminiSchema = {
  type: "OBJECT",
  required: ["selected_item_ids", "reasoning", "styling_suggestions", "weather_suitability", "missing", "alternatives"],
  properties: {
    selected_item_ids: { type: "ARRAY", items: { type: "STRING" } },
    reasoning: { type: "STRING" },
    styling_suggestions: { type: "STRING" },
    weather_suitability: { type: "STRING" },
    missing: { type: "ARRAY", items: { type: "STRING" } },
    alternatives: { type: "ARRAY", items: { type: "ARRAY", items: { type: "STRING" } } },
  },
} as const;

const INSTRUCTIONS =
  "You are a fashion stylist. Build ONE outfit using ONLY item ids from the provided wardrobe JSON. Never invent ids. Dress for the weather: above 30°C choose breathable T-shirts, lightweight shirts or shorts; 20–30°C choose T-shirts, shirts, jeans or trousers; 10–19°C choose full-sleeve shirts, sweatshirts or light jackets; below 10°C choose sweaters, hoodies, coats or warm trousers. In rain, prioritize raincoats and waterproof footwear. A typical outfit is top + bottom (or a dress/ethnic one-piece) + footwear. If key pieces are missing, list them in `missing`. Keep reasoning under 60 words, styling suggestions under 50 words. Alternatives: up to 2 other id combinations from the same wardrobe.";

class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

async function callGemini(apiKey: string, userInput: string): Promise<string> {
  const model = process.env["GEMINI_MODEL"] || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
        contents: [{ role: "user", parts: [{ text: userInput }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: geminiSchema },
      }),
      signal: AbortSignal.timeout(25000),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeminiError(res.status, body.slice(0, 300));
  }
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("");
}

export const generateOutfit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<OutfitResponse> => {
    const { data: rows, error } = await context.supabase
      .from("clothing_items")
      .select("id,name,category,color,season,occasions,availability_status,laundry_status,brand,notes");
    if (error) throw new Error("Could not load wardrobe");
    const items = (rows ?? []) as (WardrobeItem & { brand: string | null; notes: string | null })[];
    const wearable = items.filter(isWearable);
    const weather = { temperatureC: data.temperatureC, condition: data.condition ?? null, isRaining: data.isRaining };

    const rule = (notice?: string): OutfitResponse => {
      const r = recommendOutfit({ items, occasion: data.occasion, weather, preferredColors: data.preferredColors, style: data.style, variation: data.variation });
      return { source: "rule_based", itemIds: r.itemIds, explanation: r.explanation, stylingTips: "", weatherSuitability: r.weatherSuitability, missing: r.missing, alternatives: [], notice };
    };

    if (!data.useAi || wearable.length < 2) return rule(wearable.length < 2 ? "Too few available items for AI styling." : undefined);
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) return rule("AI is not configured — showing rule-based result.");

    try {
      const catalogue = wearable.map(({ id, name, category, color, season, occasions, brand }) => ({ id, name, category, color, season, occasions, brand }));
      const text = await callGemini(
        apiKey,
        JSON.stringify({
          occasion: data.occasion, weather, preferred_colors: data.preferredColors, style: data.style ?? null,
          comfort: data.comfort ?? null, variation_seed: data.variation, wardrobe: catalogue,
        }),
      );
      const parsed = JSON.parse(text) as {
        selected_item_ids: string[]; reasoning: string; styling_suggestions: string; weather_suitability: string; missing: string[]; alternatives: string[][];
      };
      // Validate ids against the user's real, wearable items.
      const valid = new Set(wearable.map((i) => i.id));
      const ids = [...new Set(parsed.selected_item_ids)].filter((id) => valid.has(id));
      if (ids.length === 0) return rule("AI returned no valid items — showing rule-based result.");
      return {
        source: "ai", itemIds: ids, explanation: parsed.reasoning, stylingTips: parsed.styling_suggestions,
        weatherSuitability: parsed.weather_suitability, missing: parsed.missing ?? [],
        alternatives: (parsed.alternatives ?? []).map((a) => a.filter((id) => valid.has(id))).filter((a) => a.length > 0),
        notice: ids.length < parsed.selected_item_ids.length ? "Some AI suggestions were removed because they aren't in your wardrobe." : undefined,
      };
    } catch (e) {
      console.error("AI outfit failed", e);
      const status = e instanceof GeminiError ? e.status : 0;
      const msg =
        status === 429
          ? "AI is busy right now — showing rule-based result."
          : status === 400 || status === 401 || status === 403
            ? "AI key was rejected — showing rule-based result."
            : "AI unavailable — showing rule-based result.";
      return rule(msg);
    }
  });
