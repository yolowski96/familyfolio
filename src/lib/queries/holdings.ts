'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from './keys';
import { useBootstrapSubscribe } from './bootstrap';
import type { DbHolding } from '@/types/db';

async function fetchHoldings(personId?: string): Promise<DbHolding[]> {
  const url = personId ? `/api/holdings?personId=${personId}` : '/api/holdings';
  const response = await fetch(url);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load holdings');
  }
  return response.json();
}

export function useHoldings(personId?: string): UseQueryResult<DbHolding[]> {
  const bootstrap = useBootstrapSubscribe();
  return useQuery({
    queryKey: personId ? queryKeys.holdings.byPerson(personId) : queryKeys.holdings.list(),
    queryFn: () => fetchHoldings(personId),
    staleTime: 5 * 60 * 1000,
    enabled: personId ? true : bootstrap.isSuccess,
  });
}

/**
 * Refresh all holdings' current prices from upstream providers, write the
 * new values to the DB, then invalidate the local cache so every consumer
 * re-reads fresh numbers. The price service already populates its own
 * 5-minute cache server-side, so follow-up live-price queries resolve
 * without additional upstream calls.
 */
export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/holdings?action=update-prices', {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update prices');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.livePrices.all });
    },
  });
}
