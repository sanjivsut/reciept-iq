// Client-side access to the price dataset.
//
// Primary source is the server route `/api/prices` (keeps the full catalog out
// of the bundle, lets prices change without a redeploy). If that request fails
// — offline PWA, route error — we fall back to the small `price-db-core.json`
// subset that IS bundled, so basic matching still works with no network.

import coreDb from "@/data/price-db-core.json";
import type { PriceEntry } from "./types";

export type PriceSource = "catalog" | "offline-core";

export interface LoadedPrices {
  currency: string;
  entries: PriceEntry[];
  source: PriceSource;
}

function coreEntries(): LoadedPrices {
  const entries = (coreDb.entries as Omit<PriceEntry, "id">[]).map((e, i) => ({
    ...e,
    id: `core-${i}`,
  }));
  return { currency: coreDb.currency ?? "INR", entries, source: "offline-core" };
}

let cache: LoadedPrices | null = null;

export async function loadPriceEntries(): Promise<LoadedPrices> {
  if (cache) return cache;

  try {
    const res = await fetch("/api/prices", { cache: "force-cache" });
    if (!res.ok) throw new Error(`prices route ${res.status}`);
    const data = (await res.json()) as { currency: string; entries: PriceEntry[] };
    if (!Array.isArray(data.entries) || data.entries.length === 0) {
      throw new Error("prices route returned no entries");
    }
    cache = { currency: data.currency ?? "INR", entries: data.entries, source: "catalog" };
  } catch {
    cache = coreEntries();
  }
  return cache;
}
