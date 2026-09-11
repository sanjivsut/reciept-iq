// Server-side proxy to a free-tier vision model (Google Gemini by default).
//
// The API key lives only here, in an environment variable — it is never sent to
// the client. Every failure path returns a small JSON body with a `code` the
// client maps to a calm "switched to on-device scanning" notice; the client
// then runs Tesseract.js locally, so a missing key or a rate limit never leaves
// the user stuck.

import type { LineItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const API_HOST = "https://generativelanguage.googleapis.com";
// Gemini's free tier occasionally returns 503 "model overloaded" — usually
// transient and resolved by an immediate retry. Split the maxDuration budget
// across a few short attempts rather than one long one.
const ATTEMPT_TIMEOUT_MS = 18000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

const PROMPT = [
  "You are a receipt parser. Extract every purchasable line item from this receipt image.",
  "Return ONLY a JSON array, no prose. Each element: {\"name\": string, \"price\": number, \"qty\": number}.",
  "- name: the item text as printed (keep fee/charge/membership lines too).",
  "- price: the money amount printed on that line, as a number (no currency symbol, no thousands separators).",
  "- qty: the quantity if printed, otherwise 1.",
  "Exclude totals, subtotals, taxes, discounts, and payment/change rows.",
  "If the image is not a receipt or is unreadable, return [].",
].join("\n");

function apiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    undefined
  );
}

function fail(status: number, code: string, error: string) {
  return Response.json({ error, code }, { status });
}

function parseDataUrl(input: unknown): { mime: string; base64: string } | null {
  if (typeof input !== "string") return null;
  const m = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

function coerceItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  const items: LineItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const price =
      typeof r.price === "number"
        ? r.price
        : typeof r.price === "string"
          ? parseFloat(r.price.replace(/[^0-9.]/g, ""))
          : NaN;
    if (!name || !Number.isFinite(price) || price <= 0) continue;
    const qtyNum =
      typeof r.qty === "number"
        ? r.qty
        : typeof r.qty === "string"
          ? parseInt(r.qty, 10)
          : 1;
    items.push({ name, price, qty: Number.isFinite(qtyNum) && qtyNum > 0 ? Math.floor(qtyNum) : 1 });
  }
  return items;
}

/** Pull the model's text output out of a Gemini generateContent response. */
function extractText(payload: unknown): string {
  const p = payload as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = p.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One attempt at calling Gemini, with its own timeout. Returns the response,
 *  or `null` if this attempt timed out (caller decides whether to retry). */
async function callGemini(url: string, requestBody: string): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: requestBody,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Tolerate a fenced ```json block or leading prose around the array. */
function parseModelJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(request: Request) {
  const key = apiKey();
  if (!key) {
    return fail(501, "no_key", "AI OCR is not configured on this deployment.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_image", "Expected a JSON body with an image data URL.");
  }

  const image = parseDataUrl((body as { image?: unknown })?.image);
  if (!image) {
    return fail(400, "bad_image", "image must be a base64 image data URL.");
  }
  // Guard against oversized payloads (base64 is ~4/3 of raw bytes).
  if (image.base64.length > 8_000_000) {
    return fail(413, "bad_image", "Image is too large; please use a smaller photo.");
  }

  const url = `${API_HOST}/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${key}`;
  const requestBody = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: image.mime, data: image.base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  let upstream: Response | null = null;
  let timedOut = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await callGemini(url, requestBody);
      if (res === null) {
        timedOut = true;
        break; // a single attempt already used the full per-attempt budget
      }
      timedOut = false;
      if (res.status === 503 && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      upstream = res;
      break;
    } catch {
      return fail(502, "upstream_error", "Could not reach the vision model.");
    }
  }

  if (timedOut || !upstream) {
    return fail(504, "upstream_error", "The vision model timed out.");
  }

  if (upstream.status === 429) {
    return fail(429, "rate_limited", "The vision model is rate-limited right now.");
  }
  if (!upstream.ok) {
    return fail(502, "upstream_error", `Vision model responded ${upstream.status}.`);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return fail(502, "bad_response", "Vision model returned a non-JSON response.");
  }

  const text = extractText(payload);
  const parsed = parseModelJson(text);
  const items = coerceItems(parsed);

  if (items.length === 0) {
    return fail(502, "bad_response", "Vision model did not return any line items.");
  }

  return Response.json({ items, engine: "ai" });
}
