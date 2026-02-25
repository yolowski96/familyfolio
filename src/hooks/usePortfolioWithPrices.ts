'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePortfolioStore, DbTransaction, DbHolding } from '@/store/usePortfolioStore';
import { AssetHolding, AssetType, PortfolioSummary, PriceData } from '@/types';

interface PriceMap {
  [symbol: string]: PriceData;
}

// Default display currency for the portfolio
const DISPLAY_CURRENCY = 'EUR';

/**
 * Fetch prices from API for given symbols (all asset types including crypto)
 * Converts all prices to the display currency (EUR)
 */
async function fetchPrices(
  assets: Array<{ symbol: string; assetType: AssetType }>,
  convertTo: string = DISPLAY_CURRENCY
): Promise<PriceMap> {
  if (assets.length === 0) return {};

  try {
    const params = new URLSearchParams({
      assets: JSON.stringify(assets),
    });
    
    // Add currency conversion parameter
    if (convertTo) {
      params.append('convertTo', convertTo);
    }

    const response = await fetch('/api/prices?' + params);

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
 * Get unique assets from transactions
 */
function getUniqueAssets(
  transactions: DbTransaction[]
): Array<{ symbol: string; assetType: AssetType; name: string }> {
  const assetMap = new Map<
    string,
    { symbol: string; assetType: AssetType; name: string }
  >();

  for (const tx of transactions) {
    if (!assetMap.has(tx.assetSymbol)) {
      assetMap.set(tx.assetSymbol, {
        symbol: tx.assetSymbol,
        assetType: tx.assetType,
        name: tx.assetName,
      });
    }
  }

  return Array.from(assetMap.values());
}

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
 * Calculate portfolio summary with prices from transactions
 */
function calculateSummaryFromTransactions(
  transactions: DbTransaction[],
  activePersonId: string | 'ALL',
  livePrices: PriceMap
): PortfolioSummary {
  // Filter transactions based on active person
  const filteredTransactions =
    activePersonId === 'ALL'
      ? transactions
      : transactions.filter((t) => t.personId === activePersonId);

  // Group transactions by symbol and calculate holdings
  const holdingsMap = new Map<
    string,
    {
      symbol: string;
      name: string;
      type: AssetType;
      totalQuantity: number;
      totalCost: number;
    }
  >();

  for (const tx of filteredTransactions) {
    const existing = holdingsMap.get(tx.assetSymbol);
    const quantity = Number(tx.quantity);
    const pricePerUnit = Number(tx.pricePerUnit);
    const quantityDelta = tx.type === 'BUY' ? quantity : -quantity;
    const costDelta = tx.type === 'BUY' ? quantity * pricePerUnit : 0;

    if (existing) {
      existing.totalQuantity += quantityDelta;
      existing.totalCost += costDelta;
    } else {
      holdingsMap.set(tx.assetSymbol, {
        symbol: tx.assetSymbol,
        name: tx.assetName,
        type: tx.assetType,
        totalQuantity: quantityDelta,
        totalCost: costDelta,
      });
    }
  }

  // Calculate holdings with current prices
  const holdings: AssetHolding[] = [];
  let totalBalance = 0;
  let totalCostBasis = 0;

  holdingsMap.forEach((holding) => {
    if (holding.totalQuantity <= 0) return;

    // Get live price from API
    const livePrice = livePrices[holding.symbol];
    
    // Use live price if available, otherwise use a fallback
    const currentPrice = livePrice?.price ?? 0;
    
    // For stocks and ETFs, calculate 24h change from chartPreviousClose
    // For crypto, use the changePercent24h from the API
    let change24hPercent = 0;
    if (holding.type === 'STOCK' || holding.type === 'ETF') {
      // Use chartPreviousClose for stocks and ETFs
      if (livePrice?.chartPreviousClose && livePrice.chartPreviousClose > 0) {
        change24hPercent = ((currentPrice - livePrice.chartPreviousClose) / livePrice.chartPreviousClose) * 100;
      }
    } else {
      // Use changePercent24h for crypto
      change24hPercent = livePrice?.changePercent24h ?? 0;
    }

    // Skip holdings without price data (will show 0 values)
    if (currentPrice === 0) {
      console.warn(`No price data for ${holding.symbol}`);
    }

    const totalValue = holding.totalQuantity * currentPrice;
    const avgBuyPrice = holding.totalCost / holding.totalQuantity;
    const unrealizedPL = totalValue - holding.totalCost;
    const unrealizedPLPercent =
      holding.totalCost > 0
        ? ((totalValue - holding.totalCost) / holding.totalCost) * 100
        : 0;

    totalBalance += totalValue;
    totalCostBasis += holding.totalCost;

    holdings.push({
      symbol: holding.symbol,
      name: holding.name,
      type: holding.type,
      totalQuantity: holding.totalQuantity,
      avgBuyPrice,
      currentPrice,
      totalValue,
      unrealizedPL,
      unrealizedPLPercent,
      allocationPercent: 0, // Will be calculated after
      change24h: (change24hPercent * holding.totalQuantity * currentPrice) / 100,
      change24hPercent,
    });
  });

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

  // Calculate holdings with current prices
  const holdings: AssetHolding[] = [];
  let totalBalance = 0;
  let totalCostBasis = 0;

  for (const dbHolding of filteredHoldings) {
    const quantity = Number(dbHolding.quantity);
    if (quantity <= 0) continue;

    // Get live price from API, fallback to stored price
    const livePrice = livePrices[dbHolding.assetSymbol];
    const currentPrice = livePrice?.price ?? Number(dbHolding.currentPrice) ?? 0;
    
    // Calculate 24h change
    let change24hPercent = 0;
    if (dbHolding.assetType === 'STOCK' || dbHolding.assetType === 'ETF') {
      if (livePrice?.chartPreviousClose && livePrice.chartPreviousClose > 0) {
        change24hPercent = ((currentPrice - livePrice.chartPreviousClose) / livePrice.chartPreviousClose) * 100;
      }
    } else {
      change24hPercent = livePrice?.changePercent24h ?? 0;
    }

    const totalInvested = Number(dbHolding.totalInvested);
    const totalValue = quantity * currentPrice;
    const avgBuyPrice = Number(dbHolding.averagePrice);
    const unrealizedPL = totalValue - totalInvested;
    const unrealizedPLPercent = totalInvested > 0
      ? ((totalValue - totalInvested) / totalInvested) * 100
      : 0;

    totalBalance += totalValue;
    totalCostBasis += totalInvested;

    holdings.push({
      symbol: dbHolding.assetSymbol,
      name: dbHolding.assetName,
      type: dbHolding.assetType,
      totalQuantity: quantity,
      avgBuyPrice,
      currentPrice,
      totalValue,
      unrealizedPL,
      unrealizedPLPercent,
      allocationPercent: 0,
      change24h: (change24hPercent * quantity * currentPrice) / 100,
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
  const transactions = usePortfolioStore((state) => state.transactions);
  const holdings = usePortfolioStore((state) => state.holdings);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);

  // Prefer holdings if available, otherwise use transactions
  const useHoldings = holdings.length > 0;

  // Get unique assets from holdings or transactions
  const uniqueAssets = useMemo(() => {
    if (useHoldings) {
      const filtered = activePersonId === 'ALL' 
        ? holdings 
        : holdings.filter(h => h.personId === activePersonId);
      return getUniqueAssetsFromHoldings(filtered);
    }
    const filtered = activePersonId === 'ALL'
      ? transactions
      : transactions.filter(t => t.personId === activePersonId);
    return getUniqueAssets(filtered);
  }, [useHoldings, holdings, transactions, activePersonId]);

  // Fetch live prices for all assets (including crypto), converted to EUR
  const {
    data: livePrices = {},
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['portfolio-prices', DISPLAY_CURRENCY, uniqueAssets.map((a) => `${a.symbol}:${a.assetType}`).join(',')],
    queryFn: () => fetchPrices(uniqueAssets, DISPLAY_CURRENCY),
    enabled: uniqueAssets.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
    refetchOnWindowFocus: true,
  });

  // Calculate summary with live prices
  const summary = useMemo(() => {
    if (useHoldings) {
      return calculateSummaryFromHoldings(holdings, activePersonId, livePrices);
    }
    return calculateSummaryFromTransactions(transactions, activePersonId, livePrices);
  }, [useHoldings, holdings, transactions, activePersonId, livePrices]);

  return {
    summary,
    isLoading,
    isError,
    refetch,
    lastUpdated: livePrices ? new Date() : null,
  };
}

/**
 * Hook to get a single asset's live price (converted to EUR)
 */
export function useAssetPrice(symbol: string, assetType: AssetType, convertTo: string = DISPLAY_CURRENCY) {
  return useQuery({
    queryKey: ['asset-price', symbol, assetType, convertTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        symbol: symbol,
        type: assetType,
      });
      
      if (convertTo) {
        params.append('convertTo', convertTo);
      }

      const response = await fetch(`/api/prices?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }

      return response.json() as Promise<PriceData>;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}
