import type { OcrEngine } from "@/lib/types";
import { Icon } from "./Icon";

/**
 * Shows which OCR engine produced a result. When a fallback happened, render
 * the optional `notice` alongside it — calmly, as a normal mode of operation,
 * never as an error state.
 */
export function EngineBadge({
  engine,
  notice,
}: {
  engine: OcrEngine;
  notice?: string;
}) {
  const isAi = engine === "ai";
  return (
    <div className="stack" style={{ marginTop: 0 }}>
      <span
        className={`engine-badge engine-badge--${isAi ? "ai" : "tesseract"}`}
        title={
          isAi
            ? "Parsed by a vision model on the server"
            : "Parsed fully on your device with Tesseract.js"
        }
      >
        <Icon name={isAi ? "sparkles" : "cpu"} size="0.95em" />
        {isAi ? "Scanned with AI" : "Scanned locally (Tesseract)"}
      </span>
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
