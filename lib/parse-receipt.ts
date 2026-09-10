// Regex line-item parsing from raw OCR text.
//
// Used by the Tesseract.js (fallback) path. The AI OCR path returns structured
// items directly and skips this step. Pure functions — no DOM, no Next.js.

import type { LineItem } from "./types";

/** Lines whose item text starts with one of these are receipt chrome, not
 *  products — totals, taxes, payment rows, headers. */
const SKIP_PREFIXES = [
  "total",
  "subtotal",
  "sub total",
  "grand total",
  "net total",
  "net amount",
  "amount payable",
  "amount due",
  "balance",
  "round off",
  "rounding",
  "savings",
  "you saved",
  "discount",
  "tax",
  "cgst",
  "sgst",
  "igst",
  "gst",
  "vat",
  "cash",
  "card",
  "upi",
  "change",
  "tendered",
  "paid",
  "invoice",
  "bill no",
  "bill no.",
  "receipt no",
  "date",
  "time",
  "table",
  "covers",
  "cashier",
  "terminal",
  "qty amount",
  "item",
];

const PRICE_RE = /(?:rs\.?|inr|₹)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*$/i;

const QTY_PATTERNS: RegExp[] = [
  /\bx\s*(\d{1,3})\b/i, // "ROTI X4", "ROTI x 4"
  /\b(\d{1,3})\s*x\b/i, // "4x ROTI"
  /\bqty\.?\s*[:=]?\s*(\d{1,3})\b/i, // "QTY: 4"
];

function toNumber(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

function shouldSkip(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (!lower) return true;
  if (!/[a-z]/i.test(lower)) return true; // no letters -> not a product line
  if (lower.replace(/[^a-z]/gi, "").length < 2) return true;
  return SKIP_PREFIXES.some(
    (p) => lower === p || lower.startsWith(p + " ") || lower.startsWith(p + ":"),
  );
}

function extractQty(name: string): { qty: number; cleanName: string } {
  for (const re of QTY_PATTERNS) {
    const m = name.match(re);
    if (m) {
      const qty = parseInt(m[1], 10);
      if (qty > 0 && qty < 1000) {
        return { qty, cleanName: name.replace(re, " ").replace(/\s+/g, " ").trim() };
      }
    }
  }
  // Leading bare count: "2 AMUL BUTTER 100G"
  const lead = name.match(/^(\d{1,3})\s+([a-z].*)$/i);
  if (lead) {
    const qty = parseInt(lead[1], 10);
    if (qty > 0 && qty < 100) return { qty, cleanName: lead[2].trim() };
  }
  return { qty: 1, cleanName: name.trim() };
}

/**
 * Parse raw receipt text into line items. Tolerant by design: anything that
 * doesn't look like "<text> ... <trailing price>" is dropped rather than guessed.
 */
export function parseReceipt(rawText: string): LineItem[] {
  if (!rawText) return [];
  const items: LineItem[] = [];

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/\.{2,}/g, " ").replace(/\s{2,}/g, " ");
    if (!trimmed) continue;

    const priceMatch = trimmed.match(PRICE_RE);
    if (!priceMatch) continue;

    const price = toNumber(priceMatch[1]);
    if (!Number.isFinite(price) || price <= 0) continue;

    let name = trimmed.slice(0, priceMatch.index).trim();
    name = name.replace(/[-–—:|]+$/, "").trim();
    if (shouldSkip(name)) continue;

    const { qty, cleanName } = extractQty(name);
    if (shouldSkip(cleanName)) continue;

    items.push({ name: cleanName, qty, price });
  }

  return items;
}
