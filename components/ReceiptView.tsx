import type { ReceiptSummary } from "@/lib/types";
import { formatMoney, formatPercent, formatRange } from "@/lib/format";
import { VerdictStamp } from "./VerdictStamp";
import { Icon } from "./Icon";

/**
 * The annotated, receipt-shaped result. Presentational and server-renderable —
 * it takes an already-analyzed summary and stamps it.
 */
export function ReceiptView({
  summary,
  store,
  date,
  engineSlot,
  compact = false,
}: {
  summary: ReceiptSummary;
  store?: string;
  date?: string;
  /** Optional node (e.g. <EngineBadge/>) rendered under the receipt head. */
  engineSlot?: React.ReactNode;
  /** Tighter type + spacing — used for the landing-page hero so it fits one screen. */
  compact?: boolean;
}) {
  const { items, currency } = summary;

  return (
    <div
      className={`tape${compact ? " tape--compact" : ""}`}
      aria-label="Annotated receipt"
    >
      <div className="tape__head">
        <div className="tape__store">{store || "Your receipt"}</div>
        <div className="tape__meta">
          {date ? `${date} · ` : ""}
          {items.length} line item{items.length === 1 ? "" : "s"}
        </div>
      </div>

      {engineSlot ? <div style={{ marginBottom: "0.9rem" }}>{engineSlot}</div> : null}

      <div>
        {items.map((a, i) => {
          const range = a.match
            ? formatRange(a.match.entry.min, a.match.entry.max, currency)
            : null;
          return (
            <div className="line" key={`${a.item.name}-${i}`}>
              <span className="line__name">{a.item.name}</span>
              <span className="line__price">
                {formatMoney(a.item.price, currency)}
                {a.item.qty > 1 ? (
                  <span className="muted"> ({a.item.qty}×)</span>
                ) : null}
              </span>

              <span className="line__sub">
                {a.match ? (
                  <>
                    matched <strong>{a.match.entry.name}</strong>
                    {a.match.entry.packSize ? ` (${a.match.entry.packSize})` : ""} · typical{" "}
                    {range}
                    {a.item.qty > 1 ? ` · unit ${formatMoney(a.unitPrice, currency)}` : ""}
                  </>
                ) : (
                  "not in the price dataset — no price verdict"
                )}
              </span>

              <span className="line__stamps">
                {a.priceVerdict === "fair" && <VerdictStamp kind="fair" />}
                {a.priceVerdict === "overpriced" && (
                  <VerdictStamp
                    kind="over"
                    label={
                      a.overBy && a.overBy > 0
                        ? `Overpriced +${formatPercent(a.overBy)}`
                        : "Overpriced"
                    }
                  />
                )}
                {a.priceVerdict === "unknown" && !a.isTrap && (
                  <VerdictStamp kind="unknown" />
                )}
                {a.isTrap && (
                  <VerdictStamp
                    kind="trap"
                    label={`Trap: ${a.trapTerms.join(", ")}`}
                  />
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="tape__totals">
        <div className="line">
          <span className="totals-label">
            <Icon name="alert" size="0.9em" style={{ color: "var(--stamp-red)" }} />
            Overpriced items
          </span>
          <span className="line__price">{summary.overpricedCount}</span>
        </div>
        <div className="line">
          <span className="totals-label">
            <Icon name="ticket" size="0.9em" style={{ color: "var(--stamp-red)" }} />
            Fee / subscription traps
          </span>
          <span className="line__price">{summary.trapCount}</span>
        </div>
        {!compact && (
          <div className="line">
            <span>Not in dataset</span>
            <span className="line__price">{summary.unknownCount}</span>
          </div>
        )}
        <hr className="tape__rule" />
        <div className="line">
          <span>Flagged amount</span>
          <span className="line__price">
            {formatMoney(summary.flaggedAmount, currency)}
          </span>
        </div>
        <div className="line">
          <strong>Receipt total</strong>
          <strong className="line__price">
            {formatMoney(summary.total, currency)}
          </strong>
        </div>
      </div>
    </div>
  );
}
