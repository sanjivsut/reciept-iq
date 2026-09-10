import { describe, it, expect } from "vitest";
import {
  analyzeReceipt,
  levenshtein,
  matchEntry,
  normalize,
  priceVerdict,
  scanTraps,
  similarity,
} from "./matching";
import { flattenPriceDb, type RawPriceDb } from "./flatten-price-db";
import rawDb from "@/data/price-db.json";
import sampleData from "@/data/sample-receipts.json";
import type { SampleReceipt } from "./types";

const { entries, currency } = flattenPriceDb(rawDb as RawPriceDb);
const SAMPLES = (sampleData as { samples: SampleReceipt[] }).samples;

describe("string helpers", () => {
  it("normalizes punctuation and case", () => {
    expect(normalize("Head & Shoulders 340ML")).toBe("head shoulders 340ml");
  });

  it("levenshtein basics", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });

  it("similarity rewards token overlap and shorthand containment", () => {
    expect(similarity("TATA SALT 1KG", "TATA SALT")).toBeGreaterThan(0.7);
    expect(similarity("USB CABLE TYPE-C", "USB Cable")).toBeGreaterThanOrEqual(0.9);
    expect(similarity("MASALA DOSA", "Ceiling Fan")).toBeLessThan(0.3);
  });
});

describe("trap keyword scan", () => {
  it("flags known trap language, independent of price", () => {
    expect(scanTraps("MEMBERSHIP FEE AUTO-RENEWAL")).toEqual(
      expect.arrayContaining(["membership", "auto-renewal"]),
    );
    expect(scanTraps("EXTENDED WARRANTY PROTECTION PLAN")).toEqual(
      expect.arrayContaining(["extended warranty", "protection plan"]),
    );
    expect(scanTraps("CARRY BAG CHARGE")).toEqual(
      expect.arrayContaining(["carry-bag charge"]),
    );
  });

  it("leaves ordinary items alone", () => {
    expect(scanTraps("AMUL BUTTER 100G")).toEqual([]);
    expect(scanTraps("MASALA DOSA")).toEqual([]);
  });
});

describe("price verdict", () => {
  it("is fair inside the range and overpriced well above it", () => {
    expect(priceVerdict(120, { min: 100, max: 130 }).verdict).toBe("fair");
    expect(priceVerdict(300, { min: 100, max: 130 }).verdict).toBe("overpriced");
  });

  it("reports how far over the max", () => {
    const r = priceVerdict(240, { min: 60, max: 120 });
    expect(r.verdict).toBe("overpriced");
    expect(r.overBy).toBeCloseTo(1, 1);
  });
});

describe("matchEntry", () => {
  it("matches receipt shorthand to the dataset", () => {
    expect(matchEntry("TATA SALT 1KG", entries)?.entry.name).toBe("Tata Salt");
    expect(matchEntry("MASALA DOSA", entries)?.entry.name).toBe("Masala Dosa");
  });

  it("returns undefined for pure fee lines", () => {
    expect(matchEntry("CONVENIENCE FEE", entries)).toBeUndefined();
    expect(matchEntry("SERVICE CHARGE", entries)).toBeUndefined();
  });
});

describe("sample receipts each surface an overpriced item and a trap", () => {
  for (const sample of SAMPLES) {
    it(sample.id, () => {
      const summary = analyzeReceipt(sample.items, entries, currency);
      expect(summary.overpricedCount).toBeGreaterThanOrEqual(1);
      expect(summary.trapCount).toBeGreaterThanOrEqual(1);
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.flaggedAmount).toBeGreaterThan(0);
      expect(summary.flaggedAmount).toBeLessThanOrEqual(summary.total);
    });
  }
});

describe("verdict checks are independent", () => {
  it("an item can be both overpriced and a trap", () => {
    const summary = analyzeReceipt(
      [{ name: "EXTENDED WARRANTY PROTECTION PLAN", qty: 1, price: 1499 }],
      entries,
      currency,
    );
    const only = summary.items[0];
    expect(only.isTrap).toBe(true);
    // no dataset match for a warranty line -> price verdict stays unknown
    expect(only.priceVerdict).toBe("unknown");
  });

  it("unmatched items are never guessed", () => {
    const summary = analyzeReceipt(
      [{ name: "ZZZ MYSTERY WIDGET", qty: 1, price: 999 }],
      entries,
      currency,
    );
    expect(summary.items[0].priceVerdict).toBe("unknown");
    expect(summary.unknownCount).toBe(1);
  });
});
