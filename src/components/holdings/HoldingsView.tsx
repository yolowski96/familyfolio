'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { usePortfolioWithPrices } from '@/hooks/usePortfolioWithPrices';
import { AssetHolding } from '@/types';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';
import { AssetDetailSheet } from '@/components/holdings/AssetDetailSheet';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { HoldingCard } from './HoldingCard';
import { HoldingsEmptyState } from './HoldingsEmptyState';
import { HoldingsSkeleton } from './HoldingsSkeleton';
import { HoldingsSummaryStats } from './HoldingsSummaryStats';
import { HoldingsTable } from './HoldingsTable';
import { HoldingsToolbar } from './HoldingsToolbar';
import { useHoldingsFilter } from './hooks/useHoldingsFilter';

export function HoldingsView() {
  usePrivacy();
  const { summary } = usePortfolioWithPrices();
  const persons = usePortfolioStore((state) => state.persons);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);
  const isInitialized = usePortfolioStore((state) => state.isInitialized);
  const storeLoading = usePortfolioStore((state) => state.isLoading);

  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [selectedAsset, setSelectedAsset] = React.useState<AssetHolding | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const filter = useHoldingsFilter(summary.holdings);

  const handleAssetClick = React.useCallback((holding: AssetHolding) => {
    setSelectedAsset(holding);
    setSheetOpen(true);
  }, []);

  const viewName = activePersonId === 'ALL'
    ? 'Family Portfolio'
    : persons.find(p => p.id === activePersonId)?.name || 'Portfolio';

  const cryptoCount = summary.holdings.filter(h => h.type === 'CRYPTO').length;
  const stockCount = summary.holdings.filter(h => h.type === 'STOCK').length;
  const etfCount = summary.holdings.filter(h => h.type === 'ETF').length;

  const hasFilters = filter.searchQuery !== '' || filter.typeFilter !== 'ALL';

  if (!isInitialized || storeLoading) {
    return <HoldingsSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Holdings</h1>
            <p className="text-muted-foreground">
              {filter.filteredHoldings.length} assets in {viewName} • {formatCurrency(summary.totalBalance)} total value
            </p>
          </div>
          <AddTransactionDialog>
            <Button className="gap-2">
              <IconPlus className="size-4" />
              Add Transaction
            </Button>
          </AddTransactionDialog>
        </div>

        {/* Summary Stats */}
        <HoldingsSummaryStats
          cryptoCount={cryptoCount}
          stockCount={stockCount}
          etfCount={etfCount}
          totalPL={summary.totalPL}
        />

        {/* Filters and View Toggle */}
        <HoldingsToolbar
          searchQuery={filter.searchQuery}
          onSearchChange={filter.setSearchQuery}
          typeFilter={filter.typeFilter}
          onTypeFilterChange={filter.setTypeFilter}
          onSort={filter.setSortWithOrder}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Holdings Grid/List */}
        {viewMode === 'grid' ? (
          <>
            {filter.paginatedHoldings.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filter.paginatedHoldings.map((holding) => (
                  <HoldingCard
                    key={holding.symbol}
                    holding={holding}
                    onClick={() => handleAssetClick(holding)}
                  />
                ))}
              </div>
            ) : (
              <HoldingsEmptyState hasFilters={hasFilters} />
            )}
          </>
        ) : (
          <HoldingsTable
            holdings={filter.paginatedHoldings}
            onAssetClick={handleAssetClick}
          />
        )}

        <DataTablePagination
          pageIndex={filter.pageIndex}
          pageSize={filter.pageSize}
          totalItems={filter.filteredHoldings.length}
          pageCount={filter.totalPages}
          canPreviousPage={filter.canGoPrevious}
          canNextPage={filter.canGoNext}
          onFirstPage={filter.goToFirstPage}
          onPreviousPage={filter.goToPreviousPage}
          onNextPage={filter.goToNextPage}
          onLastPage={filter.goToLastPage}
          itemLabel="holdings"
          bordered
        />
      </div>

      {/* Asset Detail Sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
