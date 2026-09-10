// Fuzzy matching + verdict logic for ReceiptIQ.
//
// Pure functions only — no Next.js, no DOM, no file-system access. Everything
// here is unit-testable in isolation and reused by both OCR paths and the
// sample-receipt path.

import type {
  ItemAnalysis,
  LineItem,
  PriceEntry,
  PriceVerdict,
  ReceiptSummary,
} from "./types";

/** Minimum blended similarity for a dataset match to count. Below this the
 *  item is reported as `unknown` rather than guessed. */
export const MATCH_THRESHOLD = 0.6;

/** How far above the range's max a unit price may sit before it's "overpriced".
 *  A small cushion avoids nitpicking ordinary price variation. */
export const OVERPRICE_TOLERANCE = 0.1;

/** Trap keywords scanned over each line item's text, independent of price.
 *  `term` is matched case-insensitively as a substring of the normalized text. */
export const TRAP_KEYWORDS: { term: string; label: string }[] = [
  { term: "auto-renew", label: "auto-renew" },
  { term: "auto renew", label: "auto-renew" },
  { term: "autorenew", label: "auto-renew" },
  { term: "auto-renewal", label: "auto-renewal" },
  { term: "auto renewal", label: "auto-renewal" },
  { term: "renewal", label: "renewal" },
  { term: "recurring", label: "recurring charge" },
  { term: "subscription", label: "subscription" },
  { term: "membership", label: "membership" },
  { term: "free trial", label: "free trial" },
  { term: "trial pack", label: "trial" },
  { term: "loyalty club", label: "loyalty club" },
  { term: "convenience fee", label: "convenience fee" },
  { term: "service fee", label: "service fee" },
  { term: "service charge", label: "service charge" },
  { term: "handling fee", label: "handling fee" },
  { term: "handling charge", label: "handling charge" },
  { term: "processing fee", label: "processing fee" },
  { term: "platform fee", label: "platform fee" },
  { term: "packing charge", label: "packing charge" },
  { term: "packing fee", label: "packing fee" },
  { term: "carry bag", label: "carry-bag charge" },
  { term: "bag charge", label: "bag charge" },
  { term: "protection plan", label: "protection plan" },
  { term: "extended warranty", label: "extended warranty" },
  { term: "warranty add", label: "warranty add-on" },
  { term: "add-on cover", label: "add-on cover" },
  { term: "cancellation fee", label: "cancellation fee" },
  { term: "gratuity", label: "gratuity" },
];

/** Uppercase-free normalized form: lowercase, punctuation to spaces, collapsed. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const norm = normalize(text);
  return norm ? norm.split(" ") : [];
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Levenshtein similarity as a 0..1 ratio. */
export function levenshteinRatio(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

/** Dice coefficient over token sets — good for word-order-insensitive overlap. */
export function tokenOverlap(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  return (2 * shared) / (setA.size + setB.size);
}

/** Blended similarity: token overlap weighted higher than raw edit distance,
 *  with a boost when one token set fully contains the other (receipt
 *  shorthand like "USB CABLE" vs "USB CABLE TYPE-C"). */
export function similarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const overlap = tokenOverlap(a, b);
  const ratio = levenshteinRatio(normA, normB);
  let score = overlap * 0.65 + ratio * 0.35;

  const tokA = new Set(tokenize(a));
  const tokB = new Set(tokenize(b));
  if (tokA.size >= 2 && tokB.size >= 2) {
    const aInB = [...tokA].every((t) => tokB.has(t));
    const bInA = [...tokB].every((t) => tokA.has(t));
    if (aInB || bInA) score = Math.max(score, 0.9);
  }
  return Math.min(1, score);
}

/** Best dataset match for a raw item name, comparing against each entry's
 *  canonical name, its "name packSize" combination, and every alias. */
export function matchEntry(
  rawName: string,
  entries: PriceEntry[],
): { entry: PriceEntry; score: number } | undefined {
  let best: { entry: PriceEntry; score: number } | undefined;

  for (const entry of entries) {
    const candidates = [
      entry.name,
      entry.packSize ? `${entry.name} ${entry.packSize}` : entry.name,
      ...entry.aliases,
    ];
    let entryScore = 0;
    for (const candidate of candidates) {
      const s = similarity(rawName, candidate);
      if (s > entryScore) entryScore = s;
    }
    if (!best || entryScore > best.score) best = { entry, score: entryScore };
  }

  if (!best || best.score < MATCH_THRESHOLD) return undefined;
  return best;
}

/** Price check against a matched range. Never returns "unknown" — that's the
 *  caller's job when there's no match. */
export function priceVerdict(
  unitPrice: number,
  entry: Pick<PriceEntry, "min" | "max">,
): { verdict: Exclude<PriceVerdict, "unknown">; overBy: number } {
  const ceiling = entry.max * (1 + OVERPRICE_TOLERANCE);
  if (unitPrice > ceiling) {
    return { verdict: "overpriced", overBy: (unitPrice - entry.max) / entry.max };
  }
  return { verdict: "fair", overBy: 0 };
}

/** Scan a line item's text for subscription / fee trap keywords. */
export function scanTraps(text: string): string[] {
  const haystack = ` ${normalize(text)} `;
  const hits = new Set<string>();
  for (const { term, label } of TRAP_KEYWORDS) {
    if (haystack.includes(normalize(term))) hits.add(label);
  }
  return [...hits];
}

/** Run both independent checks (price + trap) for a single line item. */
export function analyzeItem(
  item: LineItem,
  entries: PriceEntry[],
): ItemAnalysis {
  const qty = item.qty > 0 ? item.qty : 1;
  const unitPrice = qty > 1 ? item.price / qty : item.price;

  const trapTerms = scanTraps(item.name);
  const match = matchEntry(item.name, entries);

  let verdict: PriceVerdict = "unknown";
  let overBy: number | undefined;
  if (match) {
    const pv = priceVerdict(unitPrice, match.entry);
    verdict = pv.verdict;
    overBy = pv.overBy;
  }

  return {
    item,
    unitPrice: Math.round(unitPrice * 100) / 100,
    priceVerdict: verdict,
    isTrap: trapTerms.length > 0,
    trapTerms,
    match,
    overBy,
  };
}

/** Analyze a whole receipt and roll up the summary counters. */
export function analyzeReceipt(
  items: LineItem[],
  entries: PriceEntry[],
  currency = "INR",
): ReceiptSummary {
  const analyzed = items.map((item) => analyzeItem(item, entries));

  let fairCount = 0;
  let overpricedCount = 0;
  let unknownCount = 0;
  let trapCount = 0;
  let flaggedAmount = 0;
  let total = 0;

  for (const a of analyzed) {
    total += a.item.price;
    if (a.priceVerdict === "fair") fairCount++;
    else if (a.priceVerdict === "overpriced") overpricedCount++;
    else unknownCount++;
    if (a.isTrap) trapCount++;
    if (a.priceVerdict === "overpriced" || a.isTrap) flaggedAmount += a.item.price;
  }

  return {
    items: analyzed,
    fairCount,
    overpricedCount,
    unknownCount,
    trapCount,
    flaggedAmount: Math.round(flaggedAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency,
  };
}
