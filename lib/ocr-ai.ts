// Client helper for the AI OCR path.
//
// Calls the server route `/api/ocr` (which holds the vision-model API key). Any
// failure here — HTTP error, rate limit, unconfigured key, timeout, network —
// is thrown as an `OcrAiError`; ScannerApp catches it and runs the local
// Tesseract.js path instead so the user always gets a result.

import type { LineItem } from "./types";

export type OcrAiFailure =
  | "no_key"
  | "rate_limited"
  | "upstream_error"
  | "bad_response"
  | "bad_image"
  | "timeout"
  | "network";

export class OcrAiError extends Error {
  code: OcrAiFailure;
  /** Calm, user-facing sentence describing why we switched engines. */
  userMessage: string;

  constructor(code: OcrAiFailure, userMessage: string, message?: string) {
    super(message ?? userMessage);
    this.name = "OcrAiError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

const FALLBACK_COPY: Record<OcrAiFailure, string> = {
  no_key:
    "AI scanning isn't configured here, so this ran with on-device scanning instead.",
  rate_limited:
    "AI scanning hit its usage limit for now — switched to on-device scanning instead. Results may be slightly less accurate on messy photos.",
  upstream_error:
    "The AI scanning service had a hiccup — switched to on-device scanning instead.",
  bad_response:
    "The AI scan came back in an unexpected shape — switched to on-device scanning instead.",
  bad_image: "That image couldn't be read by AI scanning — switched to on-device scanning instead.",
  timeout:
    "AI scanning took too long — switched to on-device scanning instead. Results may be slightly less accurate on messy photos.",
  network:
    "Couldn't reach the AI scanning service — switched to on-device scanning instead.",
};

export function fallbackMessage(code: OcrAiFailure): string {
  return FALLBACK_COPY[code];
}

const TIMEOUT_MS = 9000;

async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new OcrAiError("bad_image", FALLBACK_COPY.bad_image));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

interface OcrApiOk {
  items: LineItem[];
}
interface OcrApiErr {
  error: string;
  code?: OcrAiFailure;
}

/** Attempt AI OCR. Resolves with line items, or throws `OcrAiError`. */
export async function recognizeWithAi(image: File | Blob): Promise<LineItem[]> {
  const dataUrl = await fileToDataUrl(image);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new OcrAiError("timeout", FALLBACK_COPY.timeout);
    }
    throw new OcrAiError("network", FALLBACK_COPY.network);
  }
  clearTimeout(timer);

  if (!res.ok) {
    let code: OcrAiFailure = "upstream_error";
    try {
      const body = (await res.json()) as OcrApiErr;
      if (body.code && body.code in FALLBACK_COPY) code = body.code;
      else if (res.status === 429) code = "rate_limited";
      else if (res.status === 501) code = "no_key";
    } catch {
      if (res.status === 429) code = "rate_limited";
    }
    throw new OcrAiError(code, FALLBACK_COPY[code]);
  }

  let data: OcrApiOk;
  try {
    data = (await res.json()) as OcrApiOk;
  } catch {
    throw new OcrAiError("bad_response", FALLBACK_COPY.bad_response);
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new OcrAiError("bad_response", FALLBACK_COPY.bad_response);
  }

  return data.items
    .filter((it) => it && typeof it.name === "string" && typeof it.price === "number")
    .map((it) => ({
      name: it.name.trim(),
      qty: Number.isFinite(it.qty) && it.qty > 0 ? Math.floor(it.qty) : 1,
      price: it.price,
    }));
}
