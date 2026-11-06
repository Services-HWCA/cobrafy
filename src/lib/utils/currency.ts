const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function formatCurrency(cents: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatCurrencyDefault(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

export function parseAmountToCents(value: string): number | null {
  const normalized = value.trim().replace(/[$,\s]/g, "");
  if (!normalized) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(amount * 100);
}

export function clampProgress(totalPaid: number, initialDebt: number): number {
  if (initialDebt <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((totalPaid / initialDebt) * 100)));
}
