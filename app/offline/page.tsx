import Link from "next/link";
import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <>
      <NavBar />
      <main className="section">
        <div className="shell" style={{ maxWidth: "40rem" }}>
          <p className="eyebrow">No connection</p>
          <h1>You&apos;re offline</h1>
          <p>
            This page isn&apos;t cached yet. The <Link href="/scan">scanner</Link> still works
            offline with sample receipts and the bundled core price list — on-device OCR needs
            a connection only for its first run.
          </p>
          <Link href="/scan" className="btn">
            <Icon name="scan" />
            Go to the scanner
          </Link>
        </div>
      </main>
      <Footer compact />
    </>
  );
}
