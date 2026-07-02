/**
 * Centralised TanStack Query keys.
 *
 * All keys are arrays starting with the domain namespace so that
 * `queryClient.invalidateQueries({ queryKey: queryKeys.persons.all })`
 * tears down every person-related query (list + individual) at once.
 */
export const queryKeys = {
  persons: {
    all: ['persons'] as const,
    list: () => [...queryKeys.persons.all, 'list'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters?: Record<string, unknown>) =>
      filters
        ? ([...queryKeys.transactions.all, 'list', filters] as const)
        : ([...queryKeys.transactions.all, 'list'] as const),
  },
  holdings: {
    all: ['holdings'] as const,
    list: () => [...queryKeys.holdings.all, 'list'] as const,
    byPerson: (personId: string) =>
      [...queryKeys.holdings.all, 'list', { personId }] as const,
  },
  livePrices: {
    all: ['livePrices'] as const,
    bySymbols: (symbolKey: string) =>
      [...queryKeys.livePrices.all, symbolKey] as const,
  },
  portfolioHistory: {
    all: ['portfolioHistory'] as const,
    byRange: (days: number, personId?: string) =>
      [
        ...queryKeys.portfolioHistory.all,
        { days, personId: personId ?? 'ALL' },
      ] as const,
  },
  bootstrap: ['bootstrap'] as const,
} as const;
