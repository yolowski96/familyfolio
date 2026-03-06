'use client';

import {
  IconCalendar,
  IconSearch,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssetType } from '@/types';
import { DbPerson } from '@/store/usePortfolioStore';
import { DateRange, TransactionTypeFilter } from './hooks/useTransactionsFilter';

interface TransactionsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  transactionTypeFilter: TransactionTypeFilter;
  onTransactionTypeFilterChange: (type: TransactionTypeFilter) => void;
  typeFilter: AssetType | 'ALL';
  onTypeFilterChange: (type: AssetType | 'ALL') => void;
  portfolioFilter: string;
  onPortfolioFilterChange: (personId: string) => void;
  persons: DbPerson[];
  showPersonFilter: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function TransactionsToolbar({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  transactionTypeFilter,
  onTransactionTypeFilterChange,
  typeFilter,
  onTypeFilterChange,
  portfolioFilter,
  onPortfolioFilterChange,
  persons,
  showPersonFilter,
  hasActiveFilters,
  onClearFilters,
}: TransactionsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by symbol or name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRange)}>
        <SelectTrigger className="w-36">
          <IconCalendar className="size-4 mr-2" />
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="90d">Last 90 Days</SelectItem>
          <SelectItem value="1y">Last Year</SelectItem>
        </SelectContent>
      </Select>

      <Select value={transactionTypeFilter} onValueChange={(v) => onTransactionTypeFilterChange(v as TransactionTypeFilter)}>
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Types</SelectItem>
          <SelectItem value="BUY">Buy</SelectItem>
          <SelectItem value="SELL">Sell</SelectItem>
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as AssetType | 'ALL')}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Asset Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Assets</SelectItem>
          <SelectItem value="CRYPTO">Crypto</SelectItem>
          <SelectItem value="STOCK">Stocks</SelectItem>
          <SelectItem value="ETF">ETFs</SelectItem>
        </SelectContent>
      </Select>

      {showPersonFilter && (
        <Select value={portfolioFilter} onValueChange={onPortfolioFilterChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Person" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Persons</SelectItem>
            {persons.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" onClick={onClearFilters} className="text-muted-foreground">
          Clear filters
        </Button>
      )}
    </div>
  );
}
