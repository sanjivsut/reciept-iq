/* Regenerates data/price-db-core.json — the small offline-fallback subset — by
 * taking the first N entries of each category from the full data/price-db.json.
 * Run with: npm run build:coredb
 *
 * The committed core file is hand-tuned; re-run this only if you want to reseed
 * it from the full catalog, then review the diff.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const PER_CATEGORY = 3;

const db = JSON.parse(await readFile(path.join(root, "data/price-db.json"), "utf8"));

const entries = [];
for (const category of db.categories) {
  for (const item of category.items.slice(0, PER_CATEGORY)) {
    entries.push({
      name: item.name,
      category: category.name,
      packSize: item.packSize,
      aliases: item.aliases ?? [],
      min: item.priceRange.min,
      max: item.priceRange.max,
    });
  }
}

const out = {
  _readme:
    "Small offline-fallback subset of data/price-db.json, kept as a flat array so the PWA can still run basic matching with no network. Illustrative prices, not live-verified. Regenerate with: npm run build:coredb",
  currency: db.currency ?? "INR",
  entries,
};

await writeFile(
  path.join(root, "data/price-db-core.json"),
  JSON.stringify(out, null, 2) + "\n",
);
console.log(`wrote data/price-db-core.json (${entries.length} entries)`);
