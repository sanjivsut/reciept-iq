// Small presentational helpers. Framework-agnostic.

export function formatMoney(amount: number, currency = "INR"): string {
  const rounded = Math.round(amount * 100) / 100;
  const hasPaise = Math.abs(rounded % 1) > 0.001;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(rounded);
  } catch {
    return `${currency} ${rounded.toFixed(hasPaise ? 2 : 0)}`;
  }
}

export function formatRange(min: number, max: number, currency = "INR"): string {
  return `${formatMoney(min, currency)}–${formatMoney(max, currency)}`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
