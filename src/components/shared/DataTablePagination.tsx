'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps {
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
  /** Noun shown in the summary ("holdings", "transactions"). */
  itemLabel?: string;
  /** When `true`, hides itself if `totalItems <= pageSize`. */
  hideWhenSinglePage?: boolean;
  /** When `true`, draws a top border (used under tables). */
  bordered?: boolean;
  className?: string;
}

/**
 * Unified pagination footer used by the holdings grid and the transactions
 * table. Replaces the previous `HoldingsPagination` and `TransactionsPagination`
 * duplicates.
 */
export function DataTablePagination({
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
  itemLabel = 'items',
  hideWhenSinglePage = false,
  bordered = false,
  className,
}: DataTablePaginationProps) {
  if (hideWhenSinglePage && totalItems <= pageSize) {
    return null;
  }

  const displayPageCount = pageCount || 1;

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        bordered && 'pt-4 border-t',
        className
      )}
    >
      <p className="text-muted-foreground text-sm">
        {totalItems > 0 ? (
          <>
            Showing {pageIndex * pageSize + 1} to{' '}
            {Math.min((pageIndex + 1) * pageSize, totalItems)} of {totalItems}{' '}
            {itemLabel}
          </>
        ) : (
          `No ${itemLabel}`
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onFirstPage}
          disabled={!canPreviousPage}
          aria-label="First page"
        >
          <IconChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
          aria-label="Previous page"
        >
          <IconChevronLeft className="size-4" />
        </Button>
        <span className="text-sm px-2">
          {pageIndex + 1} / {displayPageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextPage}
          disabled={!canNextPage}
          aria-label="Next page"
        >
          <IconChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLastPage}
          disabled={!canNextPage}
          aria-label="Last page"
        >
          <IconChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
