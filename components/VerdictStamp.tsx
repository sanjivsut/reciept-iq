import type { CSSProperties } from "react";
import { Icon, type IconName } from "./Icon";

export type StampKind = "fair" | "over" | "trap" | "unknown";

const LABELS: Record<StampKind, string> = {
  fair: "Fair",
  over: "Overpriced",
  trap: "Fee / Sub trap",
  unknown: "No price data",
};

const ICONS: Record<StampKind, IconName> = {
  fair: "check",
  over: "alert",
  trap: "ticket",
  unknown: "info",
};

export function VerdictStamp({
  kind,
  label,
  big = false,
  style,
}: {
  kind: StampKind;
  label?: string;
  big?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`stamp stamp--${kind}${big ? " stamp--big" : ""}`}
      style={style}
      role="img"
      aria-label={`Verdict: ${label ?? LABELS[kind]}`}
    >
      <Icon name={ICONS[kind]} size="0.95em" />
      {label ?? LABELS[kind]}
    </span>
  );
}
