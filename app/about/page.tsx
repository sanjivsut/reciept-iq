import Link from "next/link";
import type { Metadata } from "next";
import { getPriceData } from "@/lib/price-data";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "About & how it works",
  description:
    "How ReceiptIQ works: hybrid AI + on-device OCR, a curated (not live) price dataset, and the verdict logic — plus a plain demo disclosure.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const { entries } = getPriceData();

  return (
    <>
      <NavBar />
      <main>
        <section className="section">
          <div className="shell" style={{ maxWidth: "46rem" }}>
            <p className="eyebrow">About</p>
            <h1>What ReceiptIQ is (and isn&apos;t)</h1>

            <div className="disclosure" style={{ margin: "1.5rem 0 2rem" }}>
              <strong>Read this first.</strong> ReceiptIQ is a portfolio / development-purpose
              project. It exists to demonstrate receipt-scanning and price-flagging logic — not
              to give financial advice. The price data is curated and approximate, not
              live-verified. Verdicts can be wrong. Don&apos;t use it to decide what to buy or
              dispute a bill.
            </div>

            <h2>The verdict logic</h2>
            <p>
              Every line item gets <strong>two independent checks</strong>:
            </p>
            <ul>
              <li>
                <strong>Price check.</strong> The item name is fuzzy-matched against a curated
                &ldquo;typical price&rdquo; dataset (token overlap + edit distance, no ML). If
                it matches, the unit price is compared to that item&apos;s typical range and
                stamped <strong>Fair</strong> or <strong>Overpriced</strong>. No match means{" "}
                <strong>no price data</strong> — ReceiptIQ doesn&apos;t guess.
              </li>
              <li>
                <strong>Trap check.</strong> Independent of price, the line text is scanned for
                subscription &amp; fee trap language — <em>membership</em>, <em>auto-renew</em>,{" "}
                <em>free trial</em>, <em>convenience fee</em>, <em>protection plan</em>,{" "}
                <em>service charge</em> and similar. A hit is stamped{" "}
                <strong>Fee / Sub trap</strong>. An item can carry both stamps.
              </li>
            </ul>

            <h2>Hybrid OCR, with automatic fallback</h2>
            <p>
              For real photos, ReceiptIQ tries an <strong>AI vision model</strong> first (via a
              server route that holds the API key — it&apos;s never exposed to your browser).
              The model returns structured line items directly.
            </p>
            <p>
              If that call fails for any reason — no API key configured, a rate limit, a
              timeout, a network error — the app <strong>automatically falls back</strong> to{" "}
              <strong>Tesseract.js</strong>, which runs entirely in your browser. On that path
              your image never leaves your device. The results view always shows which engine
              produced the result, and a calm one-line notice when a fallback happened. It is a
              normal, expected mode of operation, not an error.
            </p>
            <p className="muted">
              Real-photo OCR accuracy depends on photo quality. This is a deliberately
              zero-cost, client-capable demo pipeline — not as robust as a dedicated
              production OCR service, by design.
            </p>

            <h2>The price dataset</h2>
            <p>
              There is no dataset that contains &ldquo;every product sold in India&rdquo; —
              that&apos;s tens of millions of SKUs changing daily. Instead ReceiptIQ ships{" "}
              <strong>{entries.length} curated, representative items</strong> across 22
              categories (groceries, fruit &amp; veg, dairy, beverages, snacks, personal care,
              pharmacy, home care, electronics, appliances, fashion, footwear, furniture,
              kitchenware, baby care, stationery, sports, automotive, pet supplies, dining,
              subscriptions, toys).
            </p>
            <p>
              Each entry stores a <strong>price range</strong> (min/max), not a single number,
              plus aliases for fuzzy matching. The ranges are illustrative ballpark figures
              based on general market knowledge — treat them as a working default, not verified
              live prices. The dataset is served from a server route so it stays out of the app
              bundle and can grow without shipping a bigger download; a small core subset is
              bundled for offline matching in the installed PWA.
            </p>

            <h2>One codebase, two surfaces</h2>
            <p>
              The marketing pages (<Link href="/">home</Link> and this page) are
              server-rendered for SEO — real HTML on first paint, proper metadata, fast to
              crawl. The <Link href="/scan">scanner</Link> is client-only on purpose: camera
              access, WASM OCR and canvas work can&apos;t be meaningfully server-rendered and
              carry no SEO value. Same Next.js app, responsive from ~375px to desktop, with the
              receipt/stamp visual language kept consistent across every breakpoint.
            </p>

            <h2>Installing it</h2>
            <p>
              On a supported browser you can add ReceiptIQ to your home screen and launch it
              like an app; a service worker keeps the shell and core price subset available
              offline. Installability and the service worker only activate on a real HTTPS
              deployment — not on <code>localhost</code> or a sandboxed preview.
            </p>

            <div className="row" style={{ marginTop: "2rem" }}>
              <Link href="/scan" className="btn btn--red">
                <Icon name="scan" />
                Try it
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
