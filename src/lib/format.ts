/**
 * Formatting helpers shared across dashboards.
 *
 * `formatCurrency` / `formatCurrencyCompact` / `formatQuantity` live in
 * `./utils` because they carry the privacy-masking side channel.
 */

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}
