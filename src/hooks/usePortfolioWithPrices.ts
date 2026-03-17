'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePortfolioStore, DbHolding } from '@/store/usePortfolioStore';
import { AssetHolding, AssetType, PortfolioSummary, PriceData } from '@/types';
import { fetchBatchPrices } from './usePrices';

interface PriceMap {
  [symbol: string]: PriceData;
}

const DISPLAY_CURRENCY = 'EUR';

/**
 * Get unique assets from holdings
 */
function getUniqueAssetsFromHoldings(
  holdings: DbHolding[]
): Array<{ symbol: string; assetType: AssetType; name: string }> {
  const assetMap = new Map<
    string,
    { symbol: string; assetType: AssetType; name: string }
  >();

  for (const holding of holdings) {
    if (!assetMap.has(holding.assetSymbol)) {
      assetMap.set(holding.assetSymbol, {
        symbol: holding.assetSymbol,
        assetType: holding.assetType,
        name: holding.assetName,
      });
    }
  }

  return Array.from(assetMap.values());
}

/**
 * Calculate portfolio summary from database holdings with live prices
 */
function calculateSummaryFromHoldings(
  dbHoldings: DbHolding[],
  activePersonId: string | 'ALL',
  livePrices: PriceMap
): PortfolioSummary {
  // Filter holdings based on active person
  const filteredHoldings =
    activePersonId === 'ALL'
      ? dbHoldings
      : dbHoldings.filter((h) => h.personId === activePersonId);

  // Aggregate holdings by symbol (multiple persons may hold the same asset)
  const aggregated = new Map<string, {
    symbol: string;
    name: string;
    type: AssetType;
    totalQuantity: number;
    totalInvested: number;
  }>();

  for (const dbHolding of filteredHoldings) {
    const quantity = Number(dbHolding.quantity);
    if (quantity <= 0) continue;

    const existing = aggregated.get(dbHolding.assetSymbol);
    if (existing) {
      existing.totalQuantity += quantity;
      existing.totalInvested += Number(dbHolding.totalInvested);
    } else {
      aggregated.set(dbHolding.assetSymbol, {
        symbol: dbHolding.assetSymbol,
        name: dbHolding.assetName,
        type: dbHolding.assetType,
        totalQuantity: quantity,
        totalInvested: Number(dbHolding.totalInvested),
      });
    }
  }

  // Calculate holdings with current prices
  const holdings: AssetHolding[] = [];
  let totalBalance = 0;
  let totalCostBasis = 0;

  for (const [, agg] of aggregated) {
    const livePrice = livePrices[agg.symbol];
    const currentPrice = livePrice?.price ?? 0;

    let change24hPercent = 0;
    if (agg.type === 'STOCK' || agg.type === 'ETF') {
      if (livePrice?.chartPreviousClose && livePrice.chartPreviousClose > 0) {
        change24hPercent = ((currentPrice - livePrice.chartPreviousClose) / livePrice.chartPreviousClose) * 100;
      }
    } else {
      change24hPercent = livePrice?.changePercent24h ?? 0;
    }

    const totalValue = agg.totalQuantity * currentPrice;
    const costBasis = agg.totalInvested;
    const avgBuyPrice = agg.totalQuantity > 0 ? costBasis / agg.totalQuantity : 0;
    const unrealizedPL = totalValue - costBasis;
    const unrealizedPLPercent = costBasis > 0
      ? ((totalValue - costBasis) / costBasis) * 100
      : 0;

    totalBalance += totalValue;
    totalCostBasis += costBasis;

    holdings.push({
      symbol: agg.symbol,
      name: agg.name,
      type: agg.type,
      totalQuantity: agg.totalQuantity,
      avgBuyPrice,
      costBasis,
      currentPrice,
      totalValue,
      unrealizedPL,
      unrealizedPLPercent,
      allocationPercent: 0,
      change24h: (change24hPercent * agg.totalQuantity * currentPrice) / 100,
      change24hPercent,
    });
  }

  // Calculate allocation percentages
  holdings.forEach((h) => {
    h.allocationPercent = totalBalance > 0 ? (h.totalValue / totalBalance) * 100 : 0;
  });

  // Sort by total value descending
  holdings.sort((a, b) => b.totalValue - a.totalValue);

  // Calculate allocation by type
  const typeAllocation = new Map<AssetType, number>();
  holdings.forEach((h) => {
    const current = typeAllocation.get(h.type) || 0;
    typeAllocation.set(h.type, current + h.totalValue);
  });

  const allocationByType = Array.from(typeAllocation.entries()).map(
    ([type, value]) => ({
      type,
      value,
      percent: totalBalance > 0 ? (value / totalBalance) * 100 : 0,
    })
  );

  // Find top performer
  const topPerformer = holdings.reduce<AssetHolding | null>((top, current) => {
    if (!top) return current;
    return current.unrealizedPLPercent > top.unrealizedPLPercent ? current : top;
  }, null);

  const totalPL = totalBalance - totalCostBasis;
  const totalPLPercent = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

  return {
    totalBalance,
    totalPL,
    totalPLPercent,
    topPerformer,
    holdings,
    allocationByType,
  };
}

/**
 * Hook to get portfolio summary with live prices
 * Uses database holdings and fetches real-time prices
 */
export function usePortfolioWithPrices() {
  const holdings = usePortfolioStore((state) => state.holdings);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);

  // Get unique assets from holdings
  const uniqueAssets = useMemo(() => {
    const filtered = activePersonId === 'ALL' 
      ? holdings 
      : holdings.filter(h => h.personId === activePersonId);
    return getUniqueAssetsFromHoldings(filtered);
  }, [holdings, activePersonId]);

  // Fetch live prices for all assets (including crypto), converted to EUR
  const {
    data: livePrices = {},
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['portfolio-prices', DISPLAY_CURRENCY, uniqueAssets.map((a) => `${a.symbol}:${a.assetType}`).sort().join(',')],
    queryFn: () => fetchBatchPrices(uniqueAssets, DISPLAY_CURRENCY),
    enabled: uniqueAssets.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
    refetchOnWindowFocus: true,
  });

  // Calculate summary from database holdings with live prices
  const summary = useMemo(() => {
    return calculateSummaryFromHoldings(holdings, activePersonId, livePrices);
  }, [holdings, activePersonId, livePrices]);

  return {
    summary,
    isLoading,
    isError,
    refetch,
    lastUpdated: livePrices ? new Date() : null,
  };
}
