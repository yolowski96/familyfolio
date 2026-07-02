'use client';

import { useMemo } from 'react';
import { useTransactions, useHoldings } from '@/lib/queries';
import { useActivePersonId } from '@/store/useUiStore';
import type { DbTransaction, DbHolding } from '@/types/db';

/**
 * Transactions filtered by the currently active person (or all if `ALL`).
 */
export function useFilteredTransactions(): DbTransaction[] {
  const { data: transactions = [] } = useTransactions();
  const activePersonId = useActivePersonId();

  return useMemo(() => {
    if (activePersonId === 'ALL') return transactions;
    return transactions.filter((t) => t.personId === activePersonId);
  }, [transactions, activePersonId]);
}

/**
 * Holdings filtered by the currently active person (or all if `ALL`).
 */
export function useFilteredHoldings(): DbHolding[] {
  const { data: holdings = [] } = useHoldings();
  const activePersonId = useActivePersonId();

  return useMemo(() => {
    if (activePersonId === 'ALL') return holdings;
    return holdings.filter((h) => h.personId === activePersonId);
  }, [holdings, activePersonId]);
}
