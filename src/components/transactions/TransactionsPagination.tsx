'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface TransactionsPaginationProps {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  pageCount: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
}

export function TransactionsPagination({
  pageIndex,
  pageSize,
  totalItems,
  pageCount,
  canPreviousPage,
  canNextPage,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
}: TransactionsPaginationProps) {
  if (totalItems <= pageSize) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        Showing {pageIndex * pageSize + 1} to{' '}
        {Math.min((pageIndex + 1) * pageSize, totalItems)} of{' '}
        {totalItems} transactions
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onFirstPage}
          disabled={!canPreviousPage}
        >
          <IconChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
        >
          <IconChevronLeft className="size-4" />
        </Button>
        <span className="text-sm px-2">
          Page {pageIndex + 1} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextPage}
          disabled={!canNextPage}
        >
          <IconChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLastPage}
          disabled={!canNextPage}
        >
          <IconChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
