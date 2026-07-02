'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from './keys';
import type { PortfolioHistoryPoint } from '@/lib/portfolio/history';

interface HistoryResponse {
  points: PortfolioHistoryPoint[];
}

async function fetchPortfolioHistory(
  days: number,
  personId?: string
): Promise<PortfolioHistoryPoint[]> {
  const params = new URLSearchParams({ days: String(days) });
  if (personId) params.set('personId', personId);

  const response = await fetch(`/api/portfolio/history?${params.toString()}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load portfolio history');
  }
  const json = (await response.json()) as HistoryResponse;
  return json.points;
}

/**
 * Fetches a precomputed day-by-day portfolio value series from the server.
 *
 * Replaces the previous flow where the client fetched every transaction and
 * ran `buildPortfolioHistory` locally. The server now does the heavy lifting
 * and ships a ~N+1 point array (≈2 KB) instead of the entire transactions
 * table (≈18 KB).
 *
 * Each `(days, personId)` combination is cached separately, so switching
 * between range tabs (1d / 1w / 1m / 1y / all) hits TanStack's cache on the
 * second visit and avoids a round-trip.
 */
export function usePortfolioHistory(
  days: number,
  personId?: string
): UseQueryResult<PortfolioHistoryPoint[]> {
  return useQuery({
    queryKey: queryKeys.portfolioHistory.byRange(days, personId),
    queryFn: () => fetchPortfolioHistory(days, personId),
    staleTime: 5 * 60 * 1000,
  });
}
