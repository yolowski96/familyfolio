'use client';

import { useState, useMemo } from 'react';
import { AssetHolding, AssetType } from '@/types';

export type SortField = 'value' | 'name' | 'pl' | 'change24h';
export type SortOrder = 'asc' | 'desc';

export interface UseHoldingsFilterOptions {
  initialPageSize?: number;
}

export interface UseHoldingsFilterReturn {
  // Filter state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: AssetType | 'ALL';
  setTypeFilter: (type: AssetType | 'ALL') => void;
  
  // Sort state
  sortBy: SortField;
  setSortBy: (field: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  setSortWithOrder: (field: SortField, order: SortOrder) => void;
  
  // Pagination state
  pageIndex: number;
  pageSize: number;
  setPageIndex: (index: number) => void;
  setPageSize: (size: number) => void;
  
  // Computed
  filteredHoldings: AssetHolding[];
  paginatedHoldings: AssetHolding[];
  totalPages: number;
  
  // Pagination controls
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export function useHoldingsFilter(
  holdings: AssetHolding[],
  options: UseHoldingsFilterOptions = {}
): UseHoldingsFilterReturn {
  const { initialPageSize = 12 } = options;

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'ALL'>('ALL');

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter and sort holdings
  const filteredHoldings = useMemo(() => {
    let result = [...holdings];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        h => h.symbol.toLowerCase().includes(query) || h.name.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (typeFilter !== 'ALL') {
      result = result.filter(h => h.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'value':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'name':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'pl':
          comparison = a.unrealizedPLPercent - b.unrealizedPLPercent;
          break;
        case 'change24h':
          comparison = a.change24hPercent - b.change24hPercent;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [holdings, searchQuery, typeFilter, sortBy, sortOrder]);

  // Paginate holdings
  const totalPages = Math.ceil(filteredHoldings.length / pageSize);

  const paginatedHoldings = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredHoldings.slice(start, start + pageSize);
  }, [filteredHoldings, pageIndex, pageSize]);

  // Pagination controls
  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex < totalPages - 1;

  const goToFirstPage = () => setPageIndex(0);
  const goToLastPage = () => setPageIndex(Math.max(0, totalPages - 1));
  const goToNextPage = () => canGoNext && setPageIndex(pageIndex + 1);
  const goToPreviousPage = () => canGoPrevious && setPageIndex(pageIndex - 1);

  const setSortWithOrder = (field: SortField, order: SortOrder) => {
    setSortBy(field);
    setSortOrder(order);
  };

  return {
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    setSortWithOrder,
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
    filteredHoldings,
    paginatedHoldings,
    totalPages,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  };
}
