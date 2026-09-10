import { describe, it, expect } from "vitest";
import { parseReceipt } from "./parse-receipt";
import sampleData from "@/data/sample-receipts.json";
import type { SampleReceipt } from "./types";

const SAMPLES = (sampleData as { samples: SampleReceipt[] }).samples;

describe("parseReceipt", () => {
  it("pulls name + trailing price, drops totals and separators", () => {
    const text = [
      "SHRI BALAJI KIRANA STORE",
      "BILL NO 4471   14/02/2026",
      "--------------------------------",
      "AASHIRVAAD ATTA 5KG        265.00",
      "TATA SALT 1KG               60.00",
      "CARRY BAG CHARGE            10.00",
      "--------------------------------",
      "TOTAL                      335.00",
    ].join("\n");

    const items = parseReceipt(text);
    expect(items.map((i) => i.name)).toEqual([
      "AASHIRVAAD ATTA 5KG",
      "TATA SALT 1KG",
      "CARRY BAG CHARGE",
    ]);
    expect(items[1].price).toBe(60);
  });

  it("reads quantity markers like X4 and divides later in matching", () => {
    const items = parseReceipt("TANDOORI ROTI X4           100.00");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: "TANDOORI ROTI", qty: 4, price: 100 });
  });

  it("handles thousands separators and rupee symbols", () => {
    const items = parseReceipt("EXTENDED WARRANTY PLAN    Rs 1,499.00");
    expect(items[0].price).toBe(1499);
  });

  it("ignores lines with no trailing price", () => {
    expect(parseReceipt("THANK YOU VISIT AGAIN")).toEqual([]);
  });

  it("recovers the planted line items from every sample's rawText", () => {
    for (const sample of SAMPLES) {
      const parsed = parseReceipt(sample.rawText);
      // within one item of the structured list (OCR text vs. curated items)
      expect(Math.abs(parsed.length - sample.items.length)).toBeLessThanOrEqual(1);
      expect(parsed.some((i) => /total/i.test(i.name))).toBe(false);
    }
  });
});
