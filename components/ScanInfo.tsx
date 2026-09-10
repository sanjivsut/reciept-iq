"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

/** Small "How scanning works" popover — explains the two OCR modes proactively. */
export function ScanInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="popover" ref={ref}>
      <button
        type="button"
        className="link-btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
      >
        <Icon name="info" size="0.95em" />
        How scanning works
      </button>
      {open && (
        <div className="popover__panel" role="dialog" aria-label="How scanning works">
          <h4>Two ways to read a receipt</h4>
          <p>
            We try <strong>AI scanning</strong> first — a vision model on the server reads the
            photo and returns structured line items. It&apos;s more forgiving of messy photos.
          </p>
          <p>
            If that&apos;s unavailable — no API key, a rate limit, a timeout — everything falls
            back to <strong>on-device scanning</strong> (Tesseract.js). Your image stays in your
            browser and never leaves your device on that path.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Sample receipts skip OCR entirely, so they always work.
          </p>
        </div>
      )}
    </div>
  );
}
