import { NextRequest, NextResponse } from 'next/server';
import { transactionRepository } from '@/lib/db/repositories';
import { getAuthUserFast } from '@/lib/auth';
import { handleApiError } from '@/lib/api/handle-error';
import { priceService } from '@/lib/api/price-service';
import {
  buildPortfolioHistory,
  type HistoryTransaction,
  type PortfolioHistoryPoint,
} from '@/lib/portfolio/history';
import type { AssetType } from '@/types';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 730;
const MAX_TRANSACTIONS = 2000;

interface HistoryResponse {
  points: PortfolioHistoryPoint[];
}

/**
 * Server-side portfolio history endpoint.
 *
 * Replaces the previous pattern of shipping every transaction to the client
 * just so the chart could replay them. The heavy work (sort + day-by-day
 * quantity accumulation + pricing) runs here; the response is a compact
 * `{ date, value }[]` series keyed to the requested trailing `days` window.
 *
 * Query params:
 *   - `days`     (optional, default 30, clamped to [1, 730])
 *   - `personId` (optional) — filter to a single portfolio owner
 *
 * Note on prices: we deliberately use today's market price for every day in
 * the window (no historical price API is wired up yet). The last point
 * therefore matches the current `totalBalance`; earlier points reflect only
 * the change in *held quantity*. This matches the prior client-side
 * behaviour exactly.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFast();
    const { searchParams } = new URL(request.url);

    const daysParam = Number(searchParams.get('days') ?? DEFAULT_DAYS);
    const days = Number.isFinite(daysParam)
      ? Math.max(1, Math.min(Math.trunc(daysParam), MAX_DAYS))
      : DEFAULT_DAYS;
    const personId = searchParams.get('personId') || undefined;

    const transactions = await transactionRepository.findAllLean(user.id, {
      personId,
      limit: MAX_TRANSACTIONS,
    });

    if (!transactions || transactions.length === 0) {
      const response: HistoryResponse = { points: [] };
      return NextResponse.json(response);
    }

    // Collect the unique (symbol, assetType) set so we can price every
    // asset the user has ever transacted in. Using a Map on `assetSymbol`
    // dedupes while keeping the first-seen assetType.
    const uniqueAssets = new Map<string, AssetType>();
    for (const tx of transactions) {
      if (!uniqueAssets.has(tx.assetSymbol)) {
        uniqueAssets.set(tx.assetSymbol, tx.assetType as AssetType);
      }
    }
    const assetList = Array.from(uniqueAssets.entries()).map(
      ([symbol, assetType]) => ({ symbol, assetType })
    );

    const priceMap = await priceService.batchGetPrices(assetList, 'EUR');
    const prices: Record<string, { price: number }> = {};
    for (const [symbol, data] of priceMap) {
      prices[symbol] = { price: data.price };
    }

    // Narrow the Prisma rows to the 4 fields the algorithm actually reads.
    // `Number(tx.quantity)` collapses both Prisma.Decimal and string-encoded
    // quantities to a primitive.
    const slim: HistoryTransaction[] = transactions.map((tx) => ({
      assetSymbol: tx.assetSymbol,
      type: tx.type as 'BUY' | 'SELL',
      quantity: Number(tx.quantity),
      date: tx.date,
    }));

    const points = buildPortfolioHistory(slim, prices, days);

    const response: HistoryResponse = { points };
    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, 'GET /api/portfolio/history');
  }
}
