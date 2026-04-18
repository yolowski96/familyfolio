import { DbHolding } from '@/store/usePortfolioStore';
import { AssetHolding, AssetType, PortfolioSummary, PriceData } from '@/types';

type PriceMap = Record<string, PriceData>;

/**
 * Extract the unique (symbol, assetType, name) triples from a set of holdings.
 * Used to build the batch-prices query payload.
 */
export function getUniqueAssetsFromHoldings(
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
 * Pure derivation of a portfolio summary from database holdings + live prices.
 *
 * - Filters holdings to the active person (or keeps all when `ALL`).
 * - Aggregates across persons that hold the same symbol.
 * - Marks 24h change using the 'chartPreviousClose' for stocks/ETFs and the
 *   `changePercent24h` field otherwise.
 */
export function calculateSummaryFromHoldings(
  dbHoldings: DbHolding[],
  activePersonId: string | 'ALL',
  livePrices: PriceMap
): PortfolioSummary {
  const filteredHoldings =
    activePersonId === 'ALL'
      ? dbHoldings
      : dbHoldings.filter((h) => h.personId === activePersonId);

  const aggregated = new Map<
    string,
    {
      symbol: string;
      name: string;
      type: AssetType;
      totalQuantity: number;
      totalInvested: number;
    }
  >();

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

  const holdings: AssetHolding[] = [];
  let totalBalance = 0;
  let totalCostBasis = 0;

  for (const [, agg] of aggregated) {
    const livePrice = livePrices[agg.symbol];
    const currentPrice = livePrice?.price ?? 0;

    let change24hPercent = 0;
    if (agg.type === 'STOCK' || agg.type === 'ETF') {
      if (livePrice?.chartPreviousClose && livePrice.chartPreviousClose > 0) {
        change24hPercent =
          ((currentPrice - livePrice.chartPreviousClose) /
            livePrice.chartPreviousClose) *
          100;
      }
    } else {
      change24hPercent = livePrice?.changePercent24h ?? 0;
    }

    const totalValue = agg.totalQuantity * currentPrice;
    const costBasis = agg.totalInvested;
    const avgBuyPrice = agg.totalQuantity > 0 ? costBasis / agg.totalQuantity : 0;
    const unrealizedPL = totalValue - costBasis;
    const unrealizedPLPercent =
      costBasis > 0 ? ((totalValue - costBasis) / costBasis) * 100 : 0;

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

  holdings.forEach((h) => {
    h.allocationPercent = totalBalance > 0 ? (h.totalValue / totalBalance) * 100 : 0;
  });

  holdings.sort((a, b) => b.totalValue - a.totalValue);

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
