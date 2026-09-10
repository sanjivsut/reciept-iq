// Server-side loader for the curated price dataset.
//
// The full catalog is read here and served via `app/api/prices` so it never
// ships in the client bundle. At ~350 curated entries the source of truth is a
// checked-in JSON file; see README "Price data — JSON vs database" for the plan
// when the catalog outgrows JSON.

import "server-only";
import rawDb from "@/data/price-db.json";
import { flattenPriceDb, type RawPriceDb } from "./flatten-price-db";
import type { PriceEntry } from "./types";

let cache: { currency: string; entries: PriceEntry[] } | null = null;

/** Flatten the nested category JSON into a single lookup array. Memoized for
 *  the lifetime of the server process. */
export function getPriceData(): { currency: string; entries: PriceEntry[] } {
  if (!cache) cache = flattenPriceDb(rawDb as RawPriceDb);
  return cache;
}
