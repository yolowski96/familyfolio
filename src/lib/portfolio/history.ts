import { DbTransaction } from '@/store/usePortfolioStore';
import { PriceData } from '@/types';

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

type PriceMap = Record<string, PriceData>;

/**
 * Build a day-by-day portfolio value series over the trailing `days` window,
 * using:
 *   - the real buy/sell transaction log (so the shape reflects actual
 *     capital deployment and partial sells), and
 *   - the current market price for each symbol (no historical prices API
 *     exists in this project yet), so each point is "quantity held that day
 *     x current price".
 *
 * The result is deterministic, has one entry per calendar day in the window,
 * and ends at today's actual `totalBalance` (since cumulative quantity x
 * today's price == current value).
 */
export function buildPortfolioHistory(
  transactions: DbTransaction[],
  prices: PriceMap,
  days: number,
  today: Date = new Date()
): PortfolioHistoryPoint[] {
  if (days <= 0) return [];

  const endDay = new Date(today);
  endDay.setHours(0, 0, 0, 0);

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const points: PortfolioHistoryPoint[] = [];
  const quantities = new Map<string, number>();
  let txCursor = 0;

  for (let i = days; i >= 0; i--) {
    const day = new Date(endDay);
    day.setDate(day.getDate() - i);

    // Apply every transaction up to and including this day.
    while (
      txCursor < sorted.length &&
      new Date(sorted[txCursor].date).getTime() <= day.getTime()
    ) {
      const tx = sorted[txCursor];
      const qty = Number(tx.quantity);
      const delta = tx.type === 'BUY' ? qty : -qty;
      quantities.set(
        tx.assetSymbol,
        (quantities.get(tx.assetSymbol) ?? 0) + delta
      );
      txCursor += 1;
    }

    let value = 0;
    for (const [symbol, qty] of quantities) {
      if (qty <= 0) continue;
      const livePrice = prices[symbol]?.price ?? 0;
      value += qty * livePrice;
    }

    points.push({
      date: day.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    });
  }

  return points;
}
