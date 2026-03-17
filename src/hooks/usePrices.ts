'use client';

import { useQuery } from '@tanstack/react-query';
import { PriceData, AssetType } from '@/types';

interface Asset {
  symbol: string;
  assetType: AssetType;
  exchange?: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}

/**
 * Shared utility: fetch batch prices from POST /api/prices.
 * Returns a plain object keyed by symbol. Swallows errors and returns {} on failure.
 */
export async function fetchBatchPrices(
  assets: Array<{ symbol: string; assetType: AssetType }>,
  convertTo?: string
): Promise<Record<string, PriceData>> {
  if (assets.length === 0) return {};

  try {
    const response = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets, convertTo: convertTo || undefined }),
    });

    if (!response.ok) {
      console.error('Failed to fetch prices:', response.status);
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}

/**
 * Fetch prices for multiple assets
 * Auto-refreshes every 5 minutes
 */
export function usePrices(assets: Asset[], enabled: boolean = true) {
  return useQuery<Map<string, PriceData>, Error>({
    queryKey: ['prices', assets],
    queryFn: async () => {
      const data = await fetchBatchPrices(assets);
      return new Map<string, PriceData>(Object.entries(data));
    },
    enabled: enabled && assets.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch price for a single asset
 * Auto-refreshes every 5 minutes
 */
export function usePrice(
  symbol: string,
  assetType: AssetType,
  exchange?: string,
  enabled: boolean = true
) {
  return useQuery<PriceData, Error>({
    queryKey: ['price', symbol, assetType, exchange],
    queryFn: async () => {
      const params = new URLSearchParams({
        symbol,
        type: assetType,
      });

      if (exchange) params.append('exchange', exchange);

      const response = await fetch(`/api/prices?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }

      return response.json() as Promise<PriceData>;
    },
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Search for stocks/ETFs by name or ticker
 */
export function useAssetSearch(query: string, assetType?: AssetType) {
  return useQuery<SearchResult[], Error>({
    queryKey: ['asset-search', query, assetType],
    queryFn: async () => {
      const response = await fetch('/api/prices/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, assetType }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    },
    enabled: query.length >= 2,
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

/**
 * Helper hook to get prices for portfolio holdings
 * Extracts unique symbols from holdings and fetches prices
 */
export function usePortfolioPrices(
  holdings: Array<{ symbol: string; type: AssetType; exchange?: string }>,
  enabled: boolean = true
) {
  const assets: Asset[] = holdings.map((h) => ({
    symbol: h.symbol,
    assetType: h.type,
    exchange: h.exchange,
  }));

  return usePrices(assets, enabled);
}

