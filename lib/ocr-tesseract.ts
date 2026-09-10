// Tesseract.js wrapper — the fully-local OCR fallback path.
//
// tesseract.js pulls a WASM core, a worker script and English trained data on
// first use (from a CDN), so the first run is noticeably slower than later ones.
// This module is only ever imported dynamically from a Client Component; it must
// never be evaluated during the Node SSR pass.

import type { LineItem } from "./types";
import { parseReceipt } from "./parse-receipt";

export type TesseractStage = "loading" | "recognizing" | "done";

export interface TesseractProgress {
  stage: TesseractStage;
  /** 0..1 within the current stage, when the engine reports it. */
  progress: number;
}

export interface TesseractOutcome {
  rawText: string;
  items: LineItem[];
}

/**
 * Run local OCR on an image and parse it into line items.
 * @param image  A File/Blob from an <input> or canvas capture.
 * @param onProgress  Optional progress callback for distinct loading vs. OCR UI.
 */
export async function recognizeWithTesseract(
  image: File | Blob,
  onProgress?: (p: TesseractProgress) => void,
): Promise<TesseractOutcome> {
  const { createWorker } = await import("tesseract.js");

  onProgress?.({ stage: "loading", progress: 0 });

  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (!onProgress) return;
      if (m.status === "recognizing text") {
        onProgress({ stage: "recognizing", progress: m.progress });
      } else if (
        m.status.startsWith("loading") ||
        m.status.startsWith("initial") ||
        m.status === "loading tesseract core"
      ) {
        onProgress({ stage: "loading", progress: m.progress });
      }
    },
  });

  try {
    const { data } = await worker.recognize(image);
    const rawText = data.text ?? "";
    onProgress?.({ stage: "done", progress: 1 });
    return { rawText, items: parseReceipt(rawText) };
  } finally {
    await worker.terminate();
  }
}
