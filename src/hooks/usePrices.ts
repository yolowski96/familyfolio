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
 * Fetch prices for multiple assets
 * Auto-refreshes every 5 minutes
 */
export function usePrices(assets: Asset[], enabled: boolean = true) {
  return useQuery<Map<string, PriceData>, Error>({
    queryKey: ['prices', assets],
    queryFn: async () => {
      if (assets.length === 0) return new Map<string, PriceData>();

      const response = await fetch(
        '/api/prices?' +
          new URLSearchParams({
            assets: JSON.stringify(assets),
          })
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();

      // Convert object back to Map
      return new Map<string, PriceData>(Object.entries(data));
    },
    enabled: enabled && assets.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
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
      const response = await fetch('/api/prices', {
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

