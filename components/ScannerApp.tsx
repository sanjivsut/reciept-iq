"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import sampleData from "@/data/sample-receipts.json";
import { analyzeReceipt } from "@/lib/matching";
import { loadPriceEntries, type PriceSource } from "@/lib/prices-client";
import { recognizeWithAi, OcrAiError } from "@/lib/ocr-ai";
import {
  recognizeWithTesseract,
  type TesseractProgress,
} from "@/lib/ocr-tesseract";
import type { OcrEngine, PriceEntry, ReceiptSummary, SampleReceipt } from "@/lib/types";
import { ReceiptView } from "./ReceiptView";
import { EngineBadge } from "./EngineBadge";
import { ScanInfo } from "./ScanInfo";
import { Icon } from "./Icon";

const SAMPLES = (sampleData as { samples: SampleReceipt[] }).samples;

type Phase =
  | "idle"
  | "ai"
  | "tesseract-loading"
  | "tesseract-running"
  | "done"
  | "error";

interface Result {
  source: "sample" | "photo";
  engine?: OcrEngine;
  summary: ReceiptSummary;
  store?: string;
  date?: string;
  fellBack?: boolean;
  fallbackReason?: string;
}

export function ScannerApp() {
  const [entries, setEntries] = useState<PriceEntry[]>([]);
  const [currency, setCurrency] = useState("INR");
  const [priceSource, setPriceSource] = useState<PriceSource | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [tess, setTess] = useState<TesseractProgress>({ stage: "loading", progress: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadPriceEntries().then((p) => {
      if (!alive) return;
      setEntries(p.entries);
      setCurrency(p.currency);
      setPriceSource(p.source);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const setPreviewFromFile = useCallback((file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    if (!file) {
      previewRef.current = null;
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setActiveSample(null);
    setErrorMsg(null);
    setPreviewFromFile(null);
  }, [setPreviewFromFile]);

  const runSample = useCallback(
    (sample: SampleReceipt) => {
      if (!entries.length) return;
      setPreviewFromFile(null);
      setErrorMsg(null);
      setActiveSample(sample.id);
      const summary = analyzeReceipt(sample.items, entries, currency);
      setResult({
        source: "sample",
        summary,
        store: sample.store,
        date: sample.date,
      });
      setPhase("done");
    },
    [entries, currency, setPreviewFromFile],
  );

  const runPhoto = useCallback(
    async (file: File) => {
      if (!entries.length || !file) return;
      setActiveSample(null);
      setErrorMsg(null);
      setResult(null);
      setPreviewFromFile(file);

      // 1) Try the AI path first.
      setPhase("ai");
      try {
        const items = await recognizeWithAi(file);
        const summary = analyzeReceipt(items, entries, currency);
        setResult({ source: "photo", engine: "ai", summary });
        setPhase("done");
        return;
      } catch (err) {
        const reason =
          err instanceof OcrAiError
            ? err.userMessage
            : "AI scanning wasn't available — switched to on-device scanning instead.";

        // 2) Fall back to fully-local Tesseract.js.
        setPhase("tesseract-loading");
        try {
          const { items, rawText } = await recognizeWithTesseract(file, (p) => {
            setTess(p);
            setPhase(p.stage === "recognizing" ? "tesseract-running" : "tesseract-loading");
          });
          const summary = analyzeReceipt(items, entries, currency);
          setResult({
            source: "photo",
            engine: "tesseract",
            summary,
            fellBack: true,
            fallbackReason: reason,
          });
          setPhase("done");
          if (!items.length && !rawText.trim()) {
            setErrorMsg(
              "On-device scanning couldn't read any text from that image. Try a straighter, brighter photo — or pick a sample receipt.",
            );
          }
        } catch {
          setErrorMsg(
            "Both scanning engines failed on that image. Try a different photo, or use a sample receipt.",
          );
          setPhase("error");
        }
      }
    },
    [entries, currency, setPreviewFromFile],
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (file) void runPhoto(file);
  };

  const busy =
    phase === "ai" || phase === "tesseract-loading" || phase === "tesseract-running";

  return (
    <div className="scan__layout">
      <div className="panel stack">
        <div>
          <h2>1 · Pick a sample</h2>
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            No OCR, no network — always reliable.
          </p>
          <ul className="sample-list">
            {SAMPLES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={activeSample === s.id}
                  disabled={busy || !entries.length}
                  onClick={() => runSample(s)}
                >
                  <span className="t">{s.title}</span>
                  <br />
                  <span className="b">{s.blurb}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>2 · Or scan a photo</h2>
            <ScanInfo />
          </div>
          <div className="dropzone stack">
            <div className="row" style={{ justifyContent: "center" }}>
              <label className="btn btn--ghost">
                <Icon name="upload" />
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPick}
                  disabled={busy}
                />
              </label>
              <label className="btn">
                <Icon name="camera" />
                Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={onPick}
                  disabled={busy}
                />
              </label>
            </div>
            <p className="muted">
              Real-photo accuracy depends on lighting and focus — this is a zero-cost demo
              pipeline, not a production OCR service.
            </p>
          </div>
        </div>

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Selected receipt"
            style={{ border: "1.5px solid var(--ink)", borderRadius: "2px" }}
          />
        ) : null}

        {priceSource === "offline-core" ? (
          <p className="notice">
            Using the bundled offline price subset — full catalog unavailable right now.
          </p>
        ) : null}
      </div>

      <div className="stack">
        {busy ? (
          <div className="panel stack" aria-live="polite">
            {phase === "ai" ? (
              <div className="progress">
                <span>Analyzing with AI…</span>
              </div>
            ) : (
              <>
                <div className="progress">
                  <span>
                    {phase === "tesseract-loading"
                      ? "Loading on-device OCR…"
                      : "Running on-device OCR…"}
                  </span>
                </div>
                <div className="progress">
                  <div className="bar">
                    <span style={{ width: `${Math.round(tess.progress * 100)}%` }} />
                  </div>
                </div>
                {phase === "tesseract-loading" ? (
                  <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                    First run downloads the OCR engine and English model (~5 MB). Later scans
                    are quicker.
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {errorMsg ? <p className="notice">{errorMsg}</p> : null}

        {result ? (
          <>
            <SummaryStrip summary={result.summary} />
            <ReceiptView
              summary={result.summary}
              store={result.store}
              date={result.date}
              engineSlot={
                result.source === "sample" ? (
                  <span className="engine-badge engine-badge--tesseract">
                    Sample receipt · no OCR run
                  </span>
                ) : result.engine ? (
                  <EngineBadge
                    engine={result.engine}
                    notice={result.fellBack ? result.fallbackReason : undefined}
                  />
                ) : undefined
              }
            />
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={reset}>
                <Icon name="refresh" />
                Scan another
              </button>
            </div>
          </>
        ) : !busy && !errorMsg ? (
          <div className="panel">
            <p style={{ margin: 0 }}>
              Pick a sample on the left to see verdict stamps end to end, or scan a real
              receipt photo. Every line gets two independent checks: a price check against the
              curated dataset, and a keyword scan for subscription / fee traps.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryStrip({ summary }: { summary: ReceiptSummary }) {
  return (
    <div className="summary-strip">
      <span>
        <Icon name="alert" style={{ color: "var(--stamp-red)" }} />
        <b>{summary.overpricedCount}</b> overpriced
      </span>
      <span>
        <Icon name="ticket" style={{ color: "var(--stamp-red)" }} />
        <b>{summary.trapCount}</b> traps
      </span>
      <span>
        <Icon name="check" style={{ color: "var(--stamp-green)" }} />
        <b>{summary.fairCount}</b> fair
      </span>
      <span>
        <Icon name="info" style={{ color: "var(--grey-brown)" }} />
        <b>{summary.unknownCount}</b> no data
      </span>
    </div>
  );
}
