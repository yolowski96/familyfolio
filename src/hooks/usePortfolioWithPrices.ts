'use client';

import { useEffect, useMemo } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { calculateSummaryFromHoldings } from '@/lib/portfolio/summary';

const PRICE_TTL_MS = 5 * 60 * 1000;

/**
 * Hook to get the portfolio summary with live prices.
 *
 * Source of truth is `usePortfolioStore.livePrices`, which is:
 *   - seeded in the same round-trip as holdings/persons/transactions by
 *     `loadAll` hitting `/api/dashboard`, so first render already has prices
 *     and we don't pay a client-side waterfall; and
 *   - refreshed every 5 minutes (and when the set of held symbols changes)
 *     via `refreshLivePrices`.
 *
 * Previously this hook owned its own React Query that fired a separate
 * `/api/prices` request after holdings arrived. That produced a visible
 * "€0 everywhere for ~8 seconds" window on cold loads.
 */
export function usePortfolioWithPrices() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);
  const livePrices = usePortfolioStore((state) => state.livePrices);
  const livePricesUpdatedAt = usePortfolioStore((state) => state.livePricesUpdatedAt);
  const refreshLivePrices = usePortfolioStore((state) => state.refreshLivePrices);

  // Stable key for the unique set of held symbols. A new symbol appearing
  // (e.g. after a buy of a new asset) forces us to refetch so we cover it;
  // reordering or duplicate references don't.
  const symbolKey = useMemo(() => {
    const seen = new Set<string>();
    for (const h of holdings) seen.add(h.assetSymbol);
    return Array.from(seen).sort().join(',');
  }, [holdings]);

  useEffect(() => {
    if (!symbolKey) return;

    const symbols = symbolKey.split(',');
    const isStale =
      !livePricesUpdatedAt || Date.now() - livePricesUpdatedAt > PRICE_TTL_MS;
    const missingSymbol = symbols.some((s) => !livePrices[s]);

    if (isStale || missingSymbol) {
      refreshLivePrices();
    }

    const interval = setInterval(() => {
      refreshLivePrices();
    }, PRICE_TTL_MS);
    return () => clearInterval(interval);
  }, [symbolKey, livePricesUpdatedAt, livePrices, refreshLivePrices]);

  const summary = useMemo(
    () => calculateSummaryFromHoldings(holdings, activePersonId, livePrices),
    [holdings, activePersonId, livePrices]
  );

  const lastUpdated = useMemo(
    () => (livePricesUpdatedAt ? new Date(livePricesUpdatedAt) : null),
    [livePricesUpdatedAt]
  );

  // Consumers treat "no data yet" as loading. Once we've seen a successful
  // refresh (or an empty-holdings no-op), livePricesUpdatedAt is set.
  const isLoading = holdings.length > 0 && livePricesUpdatedAt === null;

  return {
    summary,
    isLoading,
    isError: false,
    refetch: refreshLivePrices,
    lastUpdated,
    livePrices,
  };
}
