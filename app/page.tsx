import Link from "next/link";
import type { Metadata } from "next";
import { getPriceData } from "@/lib/price-data";
import { analyzeReceipt } from "@/lib/matching";
import type { LineItem } from "@/lib/types";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ReceiptView } from "@/components/ReceiptView";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "ReceiptIQ — know if you're being overcharged",
  alternates: { canonical: "/" },
};

// A deliberately short receipt for the hero so the banner fits one screen —
// still self-consistent (fair / overpriced / trap all present).
const HERO_ITEMS: LineItem[] = [
  { name: "TATA SALT 1KG", qty: 1, price: 26 },
  { name: "HEAD & SHOULDERS 340ML", qty: 1, price: 420 },
  { name: "MEMBERSHIP FEE AUTO-RENEWAL", qty: 1, price: 499 },
];

export default function HomePage() {
  const { entries, currency } = getPriceData();
  const demoSummary = analyzeReceipt(HERO_ITEMS, entries, currency);

  return (
    <>
      <NavBar />

      <main>
        <section className="hero">
          <div className="shell hero__grid">
            <div>
              <p className="eyebrow">Receipt inspection, stamped</p>
              <h1>Know if you&apos;re getting ripped off</h1>
              <p className="hero__lead">
                Scan a receipt or listing. ReceiptIQ flags the items priced above their
                typical range and the subscription &amp; fee traps hiding in the small print —
                then stamps a verdict on every line.
              </p>
              <div className="row">
                <Link href="/scan" className="btn btn--red">
                  <Icon name="scan" />
                  Try a sample scan
                </Link>
                <Link href="/about" className="btn btn--ghost">
                  How it works
                  <Icon name="arrow-right" />
                </Link>
              </div>
              <p className="muted" style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}>
                Installable as an app · works offline · {entries.length} curated price
                references across 22 categories.
              </p>
            </div>

            <div className="hero__aside">
              <ReceiptView
                summary={demoSummary}
                store="FRESHMART HYPERMARKET"
                compact
                engineSlot={
                  <span className="engine-badge engine-badge--tesseract">
                    Example · sample receipt
                  </span>
                }
              />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="shell">
            <p className="eyebrow">How it works</p>
            <h2>Three steps, one stamped verdict</h2>
            <ol className="steps" style={{ listStyle: "none", padding: 0, marginTop: "1.5rem" }}>
              <li className="step">
                <span className="step__num">
                  <Icon name="upload" size="1.05em" />
                  <span>1</span>
                </span>
                <h3>Upload a receipt</h3>
                <p>
                  Pick a built-in sample, upload a photo, or shoot one with your camera. Line
                  items get pulled out as name, price and quantity.
                </p>
              </li>
              <li className="step">
                <span className="step__num">
                  <Icon name="search" size="1.05em" />
                  <span>2</span>
                </span>
                <h3>Scan and match</h3>
                <p>
                  Each item is fuzzy-matched against a curated typical-price dataset and
                  scanned for fee &amp; subscription trap language — two independent checks.
                </p>
              </li>
              <li className="step">
                <span className="step__num">
                  <Icon name="check" size="1.05em" />
                  <span>3</span>
                </span>
                <h3>Get verdict stamps</h3>
                <p>
                  Every line comes back stamped <strong>Fair</strong>,{" "}
                  <strong>Overpriced</strong> or <strong>Trap</strong>, with a running tally of
                  the flagged amount.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section">
          <div className="shell">
            <p className="eyebrow">Why this exists</p>
            <h2>A portfolio piece with real logic</h2>
            <div className="feature-grid" style={{ marginTop: "1.5rem" }}>
              <div className="feature">
                <h3>Hybrid OCR, honest about it</h3>
                <p>
                  A vision model reads real photos first; if it&apos;s rate-limited or
                  unconfigured, everything falls back to on-device OCR automatically. The UI
                  always shows which engine ran.
                </p>
              </div>
              <div className="feature">
                <h3>Matching that isn&apos;t faked</h3>
                <p>
                  Fuzzy string matching plus range comparison and a keyword trap scan, all in
                  framework-agnostic pure functions with unit tests.
                </p>
              </div>
              <div className="feature">
                <h3>Curated data, not scraped</h3>
                <p>
                  ~{entries.length} representative items across groceries, pharmacy,
                  electronics, dining, subscriptions and more — as price ranges, not single
                  points.
                </p>
              </div>
              <div className="feature">
                <h3>One codebase, two surfaces</h3>
                <p>
                  A mobile-first installable PWA and a proper desktop marketing site, built
                  from the same Next.js app with server-rendered, indexable content.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--tight">
          <div className="shell">
            <div className="disclosure">
              <strong>Demo project.</strong> ReceiptIQ is built to showcase receipt-scanning
              and price-flagging logic. Pricing data is illustrative and approximate, not
              live-verified — don&apos;t use it to make real purchasing decisions. More detail
              on the <Link href="/about">About page</Link>.
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
