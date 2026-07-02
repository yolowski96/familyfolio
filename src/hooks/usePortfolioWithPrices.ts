'use client';

import { useMemo } from 'react';
import { useHoldings, useLivePrices } from '@/lib/queries';
import { useActivePersonId } from '@/store/useUiStore';
import { calculateSummaryFromHoldings } from '@/lib/portfolio/summary';
import type { AssetType } from '@/types';

/**
 * Portfolio summary derived from `/api/holdings` + live prices.
 *
 * Holdings come from `useHoldings` (seeded on mount by the bootstrap
 * request). Live prices come from `useLivePrices`, keyed on the unique set
 * of asset symbols currently held, and auto-refetched every 5 minutes.
 */
export function usePortfolioWithPrices() {
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings();
  const activePersonId = useActivePersonId();

  const uniqueAssets = useMemo(() => {
    const seen = new Map<string, { symbol: string; assetType: AssetType }>();
    for (const h of holdings) {
      if (!seen.has(h.assetSymbol)) {
        seen.set(h.assetSymbol, {
          symbol: h.assetSymbol,
          assetType: h.assetType,
        });
      }
    }
    return Array.from(seen.values());
  }, [holdings]);

  const {
    data: livePrices = {},
    isLoading: pricesLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useLivePrices(uniqueAssets, { convertTo: 'EUR' });

  const summary = useMemo(
    () => calculateSummaryFromHoldings(holdings, activePersonId, livePrices),
    [holdings, activePersonId, livePrices]
  );

  const lastUpdated = useMemo(
    () => (dataUpdatedAt ? new Date(dataUpdatedAt) : null),
    [dataUpdatedAt]
  );

  return {
    summary,
    isLoading: holdingsLoading || (holdings.length > 0 && pricesLoading),
    isError,
    refetch,
    lastUpdated,
    livePrices,
  };
}
