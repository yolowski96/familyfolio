'use client';

import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from './keys';
import type { DbHolding, DbPerson } from '@/types/db';
import type { PriceData } from '@/types';

export interface BootstrapResponse {
  holdings: DbHolding[];
  persons: DbPerson[];
  prices?: Record<string, PriceData>;
  // `transactions` are intentionally NOT included — they're heavy and not
  // needed for the initial dashboard render. `useTransactions` fires its
  // own request in parallel with the bootstrap.
}

async function rawFetchBootstrap(): Promise<BootstrapResponse> {
  const response = await fetch(
    '/api/dashboard?include=holdings,persons,prices'
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load dashboard data');
  }
  return response.json();
}

/**
 * Seed the TanStack cache for every child query key before the bootstrap
 * result propagates to its observers. Children are configured with
 * `enabled: bootstrap.isSuccess`; by the time they flip to enabled the
 * cache is already populated with fresh data, so their `queryFn`s don't
 * fire on cold start.
 *
 * `initialData` cannot solve this because it is only evaluated on an
 * observer's first mount — a child that mounts while bootstrap is still
 * pending gets a sticky `undefined` and then races to its own fetch.
 */
function seedChildCaches(
  queryClient: QueryClient,
  data: BootstrapResponse
): void {
  queryClient.setQueryData(queryKeys.persons.list(), data.persons);
  queryClient.setQueryData(queryKeys.holdings.list(), data.holdings);

  if (data.prices && data.holdings.length > 0) {
    // Reconstruct the exact key format that `useLivePrices` uses so the
    // single-page dashboard hit seeds its cache entry too.
    const uniqueAssets = new Map<string, string>();
    for (const h of data.holdings) {
      if (!uniqueAssets.has(h.assetSymbol)) {
        uniqueAssets.set(h.assetSymbol, h.assetType);
      }
    }
    const symbolKey = Array.from(uniqueAssets.entries())
      .map(([sym, type]) => `${sym}:${type}`)
      .sort()
      .join(',');
    queryClient.setQueryData(
      queryKeys.livePrices.bySymbols(`${symbolKey}|EUR`),
      data.prices
    );
  }
}

const BOOTSTRAP_STALE_TIME = 5 * 60 * 1000;

/**
 * The primary bootstrap hook. Called once from `StoreInitializer` when the
 * user signs in; it fires the single `/api/dashboard` request and seeds
 * every child cache as part of `queryFn`, so no sibling request ever
 * races it.
 */
export function useBootstrap(enabled: boolean): UseQueryResult<BootstrapResponse> {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: async () => {
      const data = await rawFetchBootstrap();
      seedChildCaches(queryClient, data);
      return data;
    },
    enabled,
    staleTime: BOOTSTRAP_STALE_TIME,
    gcTime: Infinity,
  });
}

/**
 * Reactive read-only subscriber used by child hooks to gate their own
 * `enabled` flag on the bootstrap status. Never fires a request on its
 * own — if `useBootstrap(true)` hasn't been mounted somewhere, this hook
 * simply reports `isPending: true` forever.
 */
export function useBootstrapSubscribe(): UseQueryResult<BootstrapResponse> {
  return useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: rawFetchBootstrap,
    enabled: false,
    staleTime: BOOTSTRAP_STALE_TIME,
    gcTime: Infinity,
  });
}
