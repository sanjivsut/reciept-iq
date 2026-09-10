// Pure flattening of the nested category price JSON into a lookup array.
// No `server-only`, no imports of the JSON itself — so this is safe to use from
// unit tests and from the server loader alike.

import type { PriceEntry } from "./types";

export interface RawPriceItem {
  name: string;
  packSize?: string;
  priceRange: { min: number; max: number };
  aliases?: string[];
}
export interface RawPriceCategory {
  name: string;
  items: RawPriceItem[];
}
export interface RawPriceDb {
  currency?: string;
  categories: RawPriceCategory[];
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function flattenPriceDb(db: RawPriceDb): {
  currency: string;
  entries: PriceEntry[];
} {
  const entries: PriceEntry[] = [];
  const seen = new Set<string>();

  for (const category of db.categories) {
    for (const item of category.items) {
      let id = slug(`${item.name}-${item.packSize ?? ""}`);
      while (seen.has(id)) id += "-x";
      seen.add(id);
      entries.push({
        id,
        name: item.name,
        category: category.name,
        packSize: item.packSize,
        aliases: item.aliases ?? [],
        min: item.priceRange.min,
        max: item.priceRange.max,
      });
    }
  }

  return { currency: db.currency ?? "INR", entries };
}
