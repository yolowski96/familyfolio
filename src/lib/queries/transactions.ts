'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from './keys';
import type { DbTransaction } from '@/types/db';

async function fetchTransactions(personId?: string): Promise<DbTransaction[]> {
  const url = personId ? `/api/transactions?personId=${personId}` : '/api/transactions';
  const response = await fetch(url);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load transactions');
  }
  return response.json();
}

export function useTransactions(personId?: string): UseQueryResult<DbTransaction[]> {
  // Transactions are NOT part of the bootstrap payload (too heavy and not
  // required for the initial dashboard paint). This query fires in
  // parallel with the bootstrap so the table populates as soon as its own
  // endpoint returns, without blocking the overview cards / chart.
  return useQuery({
    queryKey: personId
      ? queryKeys.transactions.list({ personId })
      : queryKeys.transactions.list(),
    queryFn: () => fetchTransactions(personId),
    staleTime: 5 * 60 * 1000,
  });
}

export type AddTransactionInput = Omit<
  DbTransaction,
  'id' | 'person' | 'totalAmount' | 'currency' | 'fee'
> & {
  totalAmount?: number | string;
  currency?: string;
  fee?: number | string;
};

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: AddTransactionInput): Promise<DbTransaction> => {
      const qty = Number(transaction.quantity) || 0;
      const price = Number(transaction.pricePerUnit) || 0;
      const payload = {
        ...transaction,
        totalAmount: transaction.totalAmount ?? qty * price,
        currency: transaction.currency ?? 'EUR',
        fee: transaction.fee ?? 0,
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create transaction');
      }
      const { transaction: created } = await response.json();
      return created as DbTransaction;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<DbTransaction[]>(
        queryKeys.transactions.list(),
        (prev = []) => [created, ...prev]
      );
      // Holdings always move on BUY/SELL; invalidate unconditionally so every
      // page that cares (Dashboard, Holdings, AssetDetail) refreshes. The
      // portfolio history series is derived from transactions, so it must
      // be re-fetched as well.
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.livePrices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioHistory.all });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<DbTransaction>;
    }): Promise<DbTransaction> => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update transaction');
      }
      return response.json();
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<DbTransaction[]>(
        queryKeys.transactions.list(),
        (prev = []) => prev.map((t) => (t.id === updated.id ? updated : t))
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioHistory.all });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete transaction');
      }
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<DbTransaction[]>(
        queryKeys.transactions.list(),
        (prev = []) => prev.filter((t) => t.id !== deletedId)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioHistory.all });
    },
  });
}
