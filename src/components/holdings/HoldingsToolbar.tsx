'use client';

import {
  IconChevronDown,
  IconFilter,
  IconLayoutGrid,
  IconLayoutList,
  IconSearch,
  IconSortAscending,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssetType } from '@/types';
import { SortField, SortOrder } from './hooks/useHoldingsFilter';

interface HoldingsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: AssetType | 'ALL';
  onTypeFilterChange: (type: AssetType | 'ALL') => void;
  onSort: (field: SortField, order: SortOrder) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function HoldingsToolbar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onSort,
  viewMode,
  onViewModeChange,
}: HoldingsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as AssetType | 'ALL')}>
          <SelectTrigger className="w-36">
            <IconFilter className="size-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="CRYPTO">Crypto</SelectItem>
            <SelectItem value="STOCK">Stocks</SelectItem>
            <SelectItem value="ETF">ETFs</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <IconSortAscending className="size-4" />
              Sort
              <IconChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSort('value', 'desc')}>
              Value (High to Low)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('value', 'asc')}>
              Value (Low to High)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('name', 'asc')}>
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('pl', 'desc')}>
              P/L (Best First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('pl', 'asc')}>
              P/L (Worst First)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('change24h', 'desc')}>
              24h Change (Best First)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => onViewModeChange('grid')}
        >
          <IconLayoutGrid className="size-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => onViewModeChange('list')}
        >
          <IconLayoutList className="size-4" />
        </Button>
      </div>
    </div>
  );
}
