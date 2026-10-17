export const CATEGORIES = [
  "tops", "shirts", "t-shirts", "trousers", "jeans", "ethnic wear",
  "dresses", "jackets", "footwear", "accessories",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const COLORS = [
  "black", "white", "grey", "navy", "blue", "beige", "brown", "green",
  "olive", "red", "maroon", "pink", "yellow", "orange", "purple", "multicolor",
] as const;

export const SEASONS = ["all", "summer", "winter", "monsoon", "spring", "autumn"] as const;
export const OCCASIONS = ["college", "casual", "formal", "party", "wedding", "travel", "sports"] as const;
export const AVAILABILITY = ["available", "in_use", "unavailable"] as const;
export const LAUNDRY = ["clean", "dirty", "washing"] as const;

export const NEUTRALS = ["black", "white", "grey", "navy", "beige", "brown"];

export const label = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** A device counts as connected if it reported within this window. */
export const DEVICE_ONLINE_MS = 5 * 60 * 1000;
