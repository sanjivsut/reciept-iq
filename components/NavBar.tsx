import Link from "next/link";

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com";

/**
 * Full horizontal nav on desktop, compact header on mobile. The wordmark stays
 * visible at every breakpoint (it shrinks, it does not disappear). With only
 * three links there's no need for a hamburger menu.
 */
export function NavBar() {
  return (
    <header className="nav">
      <div className="shell nav__row">
        <Link href="/" className="wordmark" aria-label="ReceiptIQ home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/receiptiq-wordmark.svg" alt="ReceiptIQ" width={168} height={38} />
        </Link>
        <nav className="nav__links" aria-label="Primary">
          <Link href="/scan">Scan</Link>
          <Link href="/about">About</Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
