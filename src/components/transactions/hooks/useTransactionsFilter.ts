'use client';

import { useState, useMemo } from 'react';
import { subDays, subMonths, isAfter, parseISO } from 'date-fns';
import { DbTransaction } from '@/store/usePortfolioStore';
import { AssetType } from '@/types';

export type DateRange = 'all' | '7d' | '30d' | '90d' | '1y';
export type TransactionTypeFilter = 'BUY' | 'SELL' | 'ALL';

export interface TransactionStats {
  totalBuys: number;
  totalSells: number;
  buyCount: number;
  sellCount: number;
  netFlow: number;
}

export interface UseTransactionsFilterOptions {
  activePersonId: string | null;
}

export interface UseTransactionsFilterReturn {
  // Filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: AssetType | 'ALL';
  setTypeFilter: (type: AssetType | 'ALL') => void;
  transactionTypeFilter: TransactionTypeFilter;
  setTransactionTypeFilter: (type: TransactionTypeFilter) => void;
  portfolioFilter: string;
  setPortfolioFilter: (personId: string) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  
  // Computed
  filteredTransactions: DbTransaction[];
  stats: TransactionStats;
  hasActiveFilters: boolean;
  
  // Actions
  clearFilters: () => void;
}

export function useTransactionsFilter(
  transactions: DbTransaction[],
  options: UseTransactionsFilterOptions
): UseTransactionsFilterReturn {
  const { activePersonId } = options;

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'ALL'>('ALL');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionTypeFilter>('ALL');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.assetSymbol.toLowerCase().includes(query) ||
          t.assetName.toLowerCase().includes(query)
      );
    }

    // Asset type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(t => t.assetType === typeFilter);
    }

    // Transaction type filter
    if (transactionTypeFilter !== 'ALL') {
      filtered = filtered.filter(t => t.type === transactionTypeFilter);
    }

    // Person filter (only when viewing ALL persons)
    if (activePersonId === 'ALL' && portfolioFilter !== 'ALL') {
      filtered = filtered.filter(t => t.personId === portfolioFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      switch (dateRange) {
        case '7d':
          startDate = subDays(now, 7);
          break;
        case '30d':
          startDate = subMonths(now, 1);
          break;
        case '90d':
          startDate = subMonths(now, 3);
          break;
        case '1y':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = new Date(0);
      }
      filtered = filtered.filter(t => isAfter(parseISO(t.date), startDate));
    }

    return filtered;
  }, [transactions, searchQuery, typeFilter, transactionTypeFilter, portfolioFilter, activePersonId, dateRange]);

  // Calculate summary stats
  const stats = useMemo<TransactionStats>(() => {
    const totalBuys = filteredTransactions
      .filter(t => t.type === 'BUY')
      .reduce((sum, t) => sum + Number(t.quantity) * Number(t.pricePerUnit), 0);

    const totalSells = filteredTransactions
      .filter(t => t.type === 'SELL')
      .reduce((sum, t) => sum + Number(t.quantity) * Number(t.pricePerUnit), 0);

    const buyCount = filteredTransactions.filter(t => t.type === 'BUY').length;
    const sellCount = filteredTransactions.filter(t => t.type === 'SELL').length;

    return { totalBuys, totalSells, buyCount, sellCount, netFlow: totalBuys - totalSells };
  }, [filteredTransactions]);

  const hasActiveFilters = searchQuery !== '' ||
    typeFilter !== 'ALL' ||
    transactionTypeFilter !== 'ALL' ||
    portfolioFilter !== 'ALL' ||
    dateRange !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
    setTransactionTypeFilter('ALL');
    setPortfolioFilter('ALL');
    setDateRange('all');
  };

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    transactionTypeFilter,
    setTransactionTypeFilter,
    portfolioFilter,
    setPortfolioFilter,
    dateRange,
    setDateRange,
    filteredTransactions,
    stats,
    hasActiveFilters,
    clearFilters,
  };
}
