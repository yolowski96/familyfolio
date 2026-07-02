'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from './keys';
import { useBootstrapSubscribe } from './bootstrap';
import type { PriceData, AssetType } from '@/types';

type Asset = { symbol: string; assetType: AssetType };

async function fetchLivePrices(
  assets: Asset[],
  convertTo = 'EUR'
): Promise<Record<string, PriceData>> {
  if (assets.length === 0) return {};

  const response = await fetch('/api/prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assets, convertTo }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load prices');
  }
  return response.json();
}

/**
 * Keyed by the sorted list of `symbol:type` pairs so cache hits only happen
 * when the exact same set of assets is requested. Auto-refetches on a
 * 5-minute interval to keep the summary row live.
 *
 * On cold start the bootstrap payload already carries EUR-converted prices
 * for every held symbol. We seed this query from that slice (via
 * `initialData`) so we don't fire a parallel `/api/prices` request while the
 * bootstrap is in flight.
 */
export function useLivePrices(
  assets: Asset[],
  options: { convertTo?: string; enabled?: boolean } = {}
): UseQueryResult<Record<string, PriceData>> {
  const { convertTo = 'EUR', enabled = true } = options;
  const bootstrap = useBootstrapSubscribe();

  const symbolKey = useMemo(
    () =>
      assets
        .map((a) => `${a.symbol}:${a.assetType}`)
        .sort()
        .join(','),
    [assets]
  );

  return useQuery({
    queryKey: queryKeys.livePrices.bySymbols(`${symbolKey}|${convertTo}`),
    queryFn: () => fetchLivePrices(assets, convertTo),
    // Gate on bootstrap so we don't race a parallel /api/prices request
    // while the dashboard bootstrap (which also ships EUR prices) is in
    // flight. For non-EUR conversions bootstrap isn't useful, but we still
    // wait — the extra few hundred ms is negligible compared to a burst of
    // parallel requests.
    enabled: enabled && assets.length > 0 && bootstrap.isSuccess,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
