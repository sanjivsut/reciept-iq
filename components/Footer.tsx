import Link from "next/link";

const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com";

export function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__row">
          <span>ReceiptIQ</span>
          <nav className="footer__links" aria-label="Footer">
            <Link href="/scan">Scan</Link>
            <Link href="/about">About</Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
              GitHub
            </a>
          </nav>
        </div>
        <p className="footer__note">
          Demo project — illustrative data.{" "}
          {!compact && (
            <>
              Pricing ranges are curated and approximate, not live-verified. Don&apos;t use
              ReceiptIQ to make real purchasing decisions.
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
