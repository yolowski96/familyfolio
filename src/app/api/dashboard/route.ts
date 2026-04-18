import { NextRequest, NextResponse } from 'next/server';
import {
  transactionRepository,
  holdingRepository,
  personRepository,
} from '@/lib/db/repositories';
import { getAuthUserFast, AuthError, unauthorizedResponse } from '@/lib/auth';
import { priceService } from '@/lib/api/price-service';
import { getUniqueAssetsFromHoldings } from '@/lib/portfolio/summary';
import type { DbHolding } from '@/store/usePortfolioStore';

/**
 * Aggregated read endpoint for the dashboard / app shell.
 *
 * Replaces the client-side waterfall of
 *   GET /api/portfolio -> POST /api/prices
 * with a single round-trip that fans out server-side.
 *
 * Supported `include` parts (comma-separated):
 *   - holdings
 *   - persons
 *   - transactions
 *   - prices      (requires holdings; EUR-converted, passed through PriceService cache)
 *
 * Defaults to all four when `include` is absent.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFast();
    const { searchParams } = new URL(request.url);
    const includeParam = searchParams.get('include');
    const parts = includeParam
      ? includeParam.split(',').map((p) => p.trim()).filter(Boolean)
      : ['holdings', 'persons', 'transactions', 'prices'];

    const wantHoldings = parts.includes('holdings');
    const wantPersons = parts.includes('persons');
    const wantTransactions = parts.includes('transactions');
    const wantPrices = parts.includes('prices');

    // Holdings must resolve first (or at least in parallel) before we can
    // derive the set of symbols to price. We kick off every request we can
    // in parallel and only chain `prices` behind `holdings`.
    const holdingsPromise = wantHoldings || wantPrices
      ? holdingRepository.findAllLean(user.id)
      : Promise.resolve(null);

    const personsPromise = wantPersons
      ? personRepository.findAll(user.id)
      : Promise.resolve(null);

    const transactionsPromise = wantTransactions
      ? transactionRepository.findAllLean(user.id)
      : Promise.resolve(null);

    const pricesPromise = wantPrices
      ? holdingsPromise.then(async (holdings) => {
          if (!holdings || holdings.length === 0) return {};
          const assets = getUniqueAssetsFromHoldings(holdings as unknown as DbHolding[]).map(
            (a) => ({ symbol: a.symbol, assetType: a.assetType })
          );
          if (assets.length === 0) return {};
          const priceMap = await priceService.batchGetPrices(assets, 'EUR');
          return Object.fromEntries(priceMap);
        })
      : Promise.resolve(null);

    const [holdings, persons, transactions, prices] = await Promise.all([
      holdingsPromise,
      personsPromise,
      transactionsPromise,
      pricesPromise,
    ]);

    const result: Record<string, unknown> = {};
    if (wantHoldings && holdings !== null) result.holdings = holdings;
    if (wantPersons && persons !== null) result.persons = persons;
    if (wantTransactions && transactions !== null) result.transactions = transactions;
    if (wantPrices && prices !== null) result.prices = prices;

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
