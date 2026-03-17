'use client';

import * as React from 'react';
import { IconDownload, IconPlus } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useFilteredTransactions, usePortfolioStore } from '@/store/usePortfolioStore';
import { AddTransactionDialog } from './AddTransactionDialog';
import { TransactionsPagination } from './TransactionsPagination';
import { TransactionsSkeleton } from './TransactionsSkeleton';
import { TransactionsSummaryStats } from './TransactionsSummaryStats';
import { TransactionsTable } from './TransactionsTable';
import { TransactionsToolbar } from './TransactionsToolbar';
import { useTransactionsFilter } from './hooks/useTransactionsFilter';

export function TransactionsView() {
  const transactions = useFilteredTransactions();
  const persons = usePortfolioStore((state) => state.persons);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);
  const deleteTransaction = usePortfolioStore((state) => state.deleteTransaction);
  const isInitialized = usePortfolioStore((state) => state.isInitialized);
  const storeLoading = usePortfolioStore((state) => state.isLoading);
  const loadPersons = usePortfolioStore((state) => state.loadPersons);
  const loadTransactions = usePortfolioStore((state) => state.loadTransactions);

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 15,
  });

  const filter = useTransactionsFilter(transactions, { activePersonId });

  // Lazy-load transactions and persons when this page mounts
  React.useEffect(() => {
    if (transactions.length === 0) {
      loadTransactions().catch(console.error);
    }
    if (persons.length === 0) {
      loadPersons().catch(console.error);
    }
  }, [transactions.length, persons.length, loadTransactions, loadPersons]);

  const viewName = activePersonId === 'ALL'
    ? 'All Portfolios'
    : persons.find(p => p.id === activePersonId)?.name || 'Portfolio';

  const getPersonName = React.useCallback((personId: string) => {
    return persons.find(p => p.id === personId)?.name || 'Unknown';
  }, [persons]);

  const handleExportCSV = React.useCallback(() => {
    if (filter.filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = [
      'Date', 'Type', 'Symbol', 'Asset Name', 'Asset Type',
      'Quantity', 'Price Per Unit', 'Total', 'Fee', 'Currency',
      'Person', 'Exchange', 'Notes',
    ];

    const rows = filter.filteredTransactions.map((t) => {
      const total = Number(t.quantity) * Number(t.pricePerUnit);
      return [
        format(parseISO(t.date), 'yyyy-MM-dd'),
        t.type,
        t.assetSymbol,
        `"${t.assetName.replace(/"/g, '""')}"`,
        t.assetType,
        Number(t.quantity),
        Number(t.pricePerUnit),
        total.toFixed(2),
        Number(t.fee || 0),
        t.currency,
        getPersonName(t.personId),
        t.exchange || '',
        t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `familyfolio-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filter.filteredTransactions.length} transactions`);
  }, [filter.filteredTransactions, getPersonName]);

  const pageCount = Math.ceil(filter.filteredTransactions.length / pagination.pageSize);

  if (!isInitialized || storeLoading) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            {filter.filteredTransactions.length} transactions in {viewName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <IconDownload className="size-4" />
            Export
          </Button>
          <AddTransactionDialog>
            <Button className="gap-2">
              <IconPlus className="size-4" />
              Add Transaction
            </Button>
          </AddTransactionDialog>
        </div>
      </div>

      {/* Summary Stats */}
      <TransactionsSummaryStats
        stats={filter.stats}
        totalCount={filter.filteredTransactions.length}
        dateRange={filter.dateRange}
      />

      {/* Filters */}
      <TransactionsToolbar
        searchQuery={filter.searchQuery}
        onSearchChange={filter.setSearchQuery}
        dateRange={filter.dateRange}
        onDateRangeChange={filter.setDateRange}
        transactionTypeFilter={filter.transactionTypeFilter}
        onTransactionTypeFilterChange={filter.setTransactionTypeFilter}
        typeFilter={filter.typeFilter}
        onTypeFilterChange={filter.setTypeFilter}
        portfolioFilter={filter.portfolioFilter}
        onPortfolioFilterChange={filter.setPortfolioFilter}
        persons={persons}
        showPersonFilter={activePersonId === 'ALL'}
        hasActiveFilters={filter.hasActiveFilters}
        onClearFilters={filter.clearFilters}
      />

      {/* Transactions Table */}
      <TransactionsTable
        transactions={filter.filteredTransactions}
        persons={persons}
        showPersonColumn={activePersonId === 'ALL'}
        onDeleteTransaction={deleteTransaction}
        hasActiveFilters={filter.hasActiveFilters}
        onClearFilters={filter.clearFilters}
        pagination={pagination}
        onPaginationChange={setPagination}
      />

      {/* Pagination */}
      <TransactionsPagination
        pageIndex={pagination.pageIndex}
        pageSize={pagination.pageSize}
        totalItems={filter.filteredTransactions.length}
        pageCount={pageCount}
        canPreviousPage={pagination.pageIndex > 0}
        canNextPage={pagination.pageIndex < pageCount - 1}
        onFirstPage={() => setPagination(p => ({ ...p, pageIndex: 0 }))}
        onPreviousPage={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))}
        onNextPage={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
        onLastPage={() => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }))}
      />
    </div>
  );
}
