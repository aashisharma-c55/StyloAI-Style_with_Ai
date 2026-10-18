import { describe, expect, it } from "vitest";
import { recommendOutfit, weatherBand, type WardrobeItem } from "@/lib/recommend";

const base = (o: Partial<WardrobeItem> & { id: string; category: string }): WardrobeItem => ({
  name: o.id, color: "black", season: "all", occasions: ["casual"],
  availability_status: "available", laundry_status: "clean", ...o,
});

describe("rule-based recommendation", () => {
  it("never picks unavailable or dirty items", () => {
    const items = [
      base({ id: "t1", category: "shirts", availability_status: "in_use" }),
      base({ id: "t2", category: "shirts", laundry_status: "dirty" }),
      base({ id: "b1", category: "jeans" }),
    ];
    const r = recommendOutfit({ items, occasion: "casual", weather: { temperatureC: 28 } });
    expect(r.itemIds).not.toContain("t1");
    expect(r.itemIds).not.toContain("t2");
    expect(r.missing).toContain("a top, shirt or T-shirt");
  });

  it("adds a jacket when it is raining", () => {
    const items = [base({ id: "t", category: "shirts" }), base({ id: "b", category: "jeans" }),
      base({ id: "s", category: "footwear" }), base({ id: "j", category: "jackets" })];
    const r = recommendOutfit({ items, occasion: "college", weather: { temperatureC: 26, isRaining: true } });
    expect(r.itemIds).toContain("j");
  });

  it("reports missing jacket in cold weather instead of inventing one", () => {
    const items = [base({ id: "t", category: "shirts" }), base({ id: "b", category: "jeans" }), base({ id: "s", category: "footwear" })];
    const r = recommendOutfit({ items, occasion: "casual", weather: { temperatureC: 8 } });
    expect(r.missing).toContain("a jacket for cooler weather");
    expect(r.itemIds).toEqual(["t", "b", "s"]);
  });

  it("uses the requested temperature boundaries for clothing advice", () => {
    expect(weatherBand({ temperatureC: 31 })).toBe("hot");
    expect(weatherBand({ temperatureC: 30 })).toBe("warm");
    expect(weatherBand({ temperatureC: 20 })).toBe("warm");
    expect(weatherBand({ temperatureC: 19 })).toBe("cool");
    expect(weatherBand({ temperatureC: 10 })).toBe("cool");
    expect(weatherBand({ temperatureC: 9 })).toBe("cold");
  });

  it("prefers a raincoat over an ordinary jacket during rain", () => {
    const items = [
      base({ id: "shirt", category: "shirts" }),
      base({ id: "jeans", category: "jeans" }),
      base({ id: "shoes", category: "footwear" }),
      base({ id: "ordinary", category: "jackets", name: "Everyday jacket" }),
      base({ id: "raincoat", category: "jackets", name: "Waterproof raincoat" }),
    ];
    const r = recommendOutfit({ items, occasion: "casual", weather: { temperatureC: 16, isRaining: true } });
    expect(r.itemIds).toContain("raincoat");
    expect(r.itemIds).not.toContain("ordinary");
  });
});
