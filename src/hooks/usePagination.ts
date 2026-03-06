'use client';

import { useState, useMemo, useCallback } from 'react';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface UsePaginationOptions {
  initialPageIndex?: number;
  initialPageSize?: number;
}

export interface UsePaginationReturn<T> {
  paginatedData: T[];
  pagination: PaginationState;
  pageCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  firstPage: () => void;
  lastPage: () => void;
}

/**
 * Hook for managing pagination state and logic
 * @param data - The full array of data to paginate
 * @param options - Pagination options
 * @returns Pagination state and controls
 */
export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPageIndex = 0, initialPageSize = 10 } = options;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });

  const pageCount = useMemo(
    () => Math.ceil(data.length / pagination.pageSize),
    [data.length, pagination.pageSize]
  );

  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return data.slice(start, end);
  }, [data, pagination.pageIndex, pagination.pageSize]);

  const canPreviousPage = pagination.pageIndex > 0;
  const canNextPage = pagination.pageIndex < pageCount - 1;

  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(0, Math.min(page, pageCount - 1));
      setPagination((prev) => ({ ...prev, pageIndex: validPage }));
    },
    [pageCount]
  );

  const nextPage = useCallback(() => {
    if (canNextPage) {
      setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
    }
  }, [canNextPage]);

  const previousPage = useCallback(() => {
    if (canPreviousPage) {
      setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }));
    }
  }, [canPreviousPage]);

  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => ({
      pageSize: size,
      pageIndex: Math.floor((prev.pageIndex * prev.pageSize) / size),
    }));
  }, []);

  const firstPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const lastPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: pageCount - 1 }));
  }, [pageCount]);

  return {
    paginatedData,
    pagination,
    pageCount,
    canPreviousPage,
    canNextPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    firstPage,
    lastPage,
  };
}
