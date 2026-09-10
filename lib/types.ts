// Shared types for the ReceiptIQ scanner. Framework-agnostic — safe to import
// from server routes, client components, and unit tests alike.

/** A single normalized entry from the curated price dataset. */
export interface PriceEntry {
  /** Stable id: slug of name + pack size. */
  id: string;
  name: string;
  category: string;
  packSize?: string;
  /** Alternate spellings / receipt shorthands used for fuzzy matching. */
  aliases: string[];
  /** Typical price range, in the dataset's currency (INR). */
  min: number;
  max: number;
}

/** A line item as extracted from OCR text or a sample receipt. */
export interface LineItem {
  /** Raw item text as it appeared on the receipt. */
  name: string;
  /** Quantity if the receipt stated one, else 1. */
  qty: number;
  /** The money amount printed on the line (treated as the line total). */
  price: number;
}

export type PriceVerdict = "fair" | "overpriced" | "unknown";

/** Result of matching one line item against the dataset + trap keywords. */
export interface ItemAnalysis {
  item: LineItem;
  /** Per-unit price used for the range comparison (price / qty). */
  unitPrice: number;
  priceVerdict: PriceVerdict;
  /** True when trap keywords were found in the item text. */
  isTrap: boolean;
  /** Which trap keywords matched, if any. */
  trapTerms: string[];
  /** The dataset entry we matched, when priceVerdict !== "unknown". */
  match?: {
    entry: PriceEntry;
    /** 0..1 similarity score of the best match. */
    score: number;
  };
  /** How far outside the range the unit price sits, as a fraction of max. */
  overBy?: number;
}

export interface ReceiptSummary {
  items: ItemAnalysis[];
  fairCount: number;
  overpricedCount: number;
  unknownCount: number;
  trapCount: number;
  /** Sum of line amounts flagged overpriced or as a trap. */
  flaggedAmount: number;
  /** Sum of all line amounts. */
  total: number;
  currency: string;
}

export type OcrEngine = "ai" | "tesseract";

export interface OcrResult {
  engine: OcrEngine;
  items: LineItem[];
  /** Raw text, when the engine produced it (Tesseract path). */
  rawText?: string;
  /** Set when the AI path was attempted but the app fell back to Tesseract. */
  fellBack?: boolean;
  /** Short, user-facing reason for the fallback. */
  fallbackReason?: string;
}

export interface SampleReceipt {
  id: string;
  title: string;
  blurb: string;
  store: string;
  date: string;
  rawText: string;
  items: LineItem[];
}
