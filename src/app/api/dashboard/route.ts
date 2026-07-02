import { NextRequest, NextResponse } from 'next/server';
import {
  transactionRepository,
  holdingRepository,
  personRepository,
} from '@/lib/db/repositories';
import { getAuthUserFast } from '@/lib/auth';
import { handleApiError } from '@/lib/api/handle-error';
import { priceService } from '@/lib/api/price-service';
import { getUniqueAssetsFromHoldings } from '@/lib/portfolio/summary';
import type { DbHolding } from '@/types/db';

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
  const t0 = performance.now();
  const timings: Record<string, number> = {};
  const mark = (label: string, from: number) => {
    timings[label] = Math.round(performance.now() - from);
  };

  try {
    const tAuth = performance.now();
    const user = await getAuthUserFast();
    mark('auth', tAuth);

    const { searchParams } = new URL(request.url);
    const includeParam = searchParams.get('include');
    // Default intentionally excludes `transactions` — they are heavy (often
    // hundreds of rows) and not needed for the initial dashboard render.
    // The transactions list fetches itself via `useTransactions` after
    // bootstrap resolves. Callers that do need the full set must opt-in
    // explicitly via `?include=...,transactions`.
    const parts = includeParam
      ? includeParam.split(',').map((p) => p.trim()).filter(Boolean)
      : ['holdings', 'persons', 'prices'];

    const wantHoldings = parts.includes('holdings');
    const wantPersons = parts.includes('persons');
    const wantTransactions = parts.includes('transactions');
    const wantPrices = parts.includes('prices');

    const tHoldings = performance.now();
    const holdingsPromise = (wantHoldings || wantPrices
      ? holdingRepository.findAllLean(user.id)
      : Promise.resolve(null)
    ).then((v) => {
      mark('holdings', tHoldings);
      return v;
    });

    const tPersons = performance.now();
    const personsPromise = (wantPersons
      ? personRepository.findAll(user.id)
      : Promise.resolve(null)
    ).then((v) => {
      mark('persons', tPersons);
      return v;
    });

    const tTx = performance.now();
    const transactionsPromise = (wantTransactions
      ? transactionRepository.findAllLean(user.id)
      : Promise.resolve(null)
    ).then((v) => {
      mark('transactions', tTx);
      return v;
    });

    const pricesPromise = wantPrices
      ? holdingsPromise.then(async (holdings) => {
          const tPrices = performance.now();
          if (!holdings || holdings.length === 0) {
            mark('prices', tPrices);
            return {};
          }
          const assets = getUniqueAssetsFromHoldings(holdings as unknown as DbHolding[]).map(
            (a) => ({ symbol: a.symbol, assetType: a.assetType })
          );
          if (assets.length === 0) {
            mark('prices', tPrices);
            return {};
          }
          const priceMap = await priceService.batchGetPrices(assets, 'EUR');
          mark('prices', tPrices);
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

    timings.total = Math.round(performance.now() - t0);
    console.log('[dashboard] timings (ms)', timings);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'GET /api/dashboard');
  }
}
