import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ScannerApp } from "@/components/ScannerApp";

export const metadata: Metadata = {
  title: "Scan a receipt",
  description:
    "Scan a sample or real receipt and get per-line verdicts on overpriced items and hidden fee traps.",
  alternates: { canonical: "/scan" },
};

/**
 * Thin server wrapper. The scanner itself is client-only: camera access,
 * Tesseract.js WASM and canvas work can't be server-rendered and carry no SEO
 * value, so this route deliberately doesn't try. The marketing pages ( / and
 * /about ) are the server-rendered, indexable surface.
 */
export default function ScanPage() {
  return (
    <>
      <NavBar />
      <main className="scan">
        <div className="shell stack">
          <div>
            <p className="eyebrow">Scanner</p>
            <h1>Stamp a receipt</h1>
            <p className="muted" style={{ maxWidth: "52ch" }}>
              Two independent checks per line: a price check against the curated dataset, and a
              keyword scan for subscription &amp; fee traps. An item can carry both.
            </p>
          </div>

          <ScannerApp />

          <p className="footer__note" style={{ fontSize: "0.82rem" }}>
            Demo project — illustrative data. Not financial advice.
          </p>
        </div>
      </main>
      <Footer compact />
    </>
  );
}
