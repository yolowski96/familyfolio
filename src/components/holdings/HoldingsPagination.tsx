'use client';

import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface HoldingsPaginationProps {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export function HoldingsPagination({
  pageIndex,
  pageSize,
  totalItems,
  totalPages,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
  canGoNext,
  canGoPrevious,
}: HoldingsPaginationProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <p className="text-muted-foreground text-sm">
        {totalItems > 0 ? (
          <>
            Showing {pageIndex * pageSize + 1} to{' '}
            {Math.min((pageIndex + 1) * pageSize, totalItems)} of{' '}
            {totalItems} holdings
          </>
        ) : (
          'No holdings'
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onFirstPage}
          disabled={!canGoPrevious}
        >
          <IconChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onPreviousPage}
          disabled={!canGoPrevious}
        >
          <IconChevronLeft className="size-4" />
        </Button>
        <span className="text-sm px-2">
          {pageIndex + 1} / {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={onNextPage}
          disabled={!canGoNext}
        >
          <IconChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLastPage}
          disabled={!canGoNext}
        >
          <IconChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
