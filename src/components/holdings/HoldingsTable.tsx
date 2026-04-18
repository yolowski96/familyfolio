'use client';

import * as React from 'react';
import {
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { AssetTypeIcon, TYPE_COLORS } from '@/lib/assetTypeDisplay';
import { AssetHolding } from '@/types';

interface HoldingsTableProps {
  holdings: AssetHolding[];
  onAssetClick: (holding: AssetHolding) => void;
}

export function HoldingsTable({ holdings, onAssetClick }: HoldingsTableProps) {
  usePrivacy();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const columns: ColumnDef<AssetHolding>[] = React.useMemo(
    () => [
      {
        accessorKey: 'symbol',
        header: 'Asset',
        cell: ({ row }) => {
          const holding = row.original;
          return (
            <button
              className="flex items-center gap-3 text-left hover:opacity-80"
              onClick={() => onAssetClick(holding)}
            >
              <div className={`flex size-8 items-center justify-center rounded-lg ${TYPE_COLORS[holding.type]}`}>
                <AssetTypeIcon type={holding.type} size="sm" />
              </div>
              <div>
                <div className="font-medium">{holding.symbol}</div>
                <div className="text-muted-foreground text-sm">{holding.name}</div>
              </div>
            </button>
          );
        },
      },
      {
        accessorKey: 'currentPrice',
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => {
          const holding = row.original;
          return (
            <div className="text-right">
              <div>{formatCurrency(holding.currentPrice)}</div>
              <div className="text-muted-foreground text-xs">
                Avg: {formatCurrency(holding.avgBuyPrice)}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'totalQuantity',
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {formatQuantity(row.original.totalQuantity)}
          </div>
        ),
      },
      {
        accessorKey: 'change24hPercent',
        header: () => <div className="text-right">24h Change</div>,
        cell: ({ row }) => {
          const holding = row.original;
          const isPositive = holding.change24hPercent >= 0;
          return (
            <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isPositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
              {formatPercent(holding.change24hPercent)}
            </div>
          );
        },
      },
      {
        accessorKey: 'unrealizedPL',
        header: () => <div className="text-right">Unrealized P/L</div>,
        cell: ({ row }) => {
          const holding = row.original;
          const isPositive = holding.unrealizedPL >= 0;
          return (
            <div className="text-right">
              <div className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                {formatCurrency(holding.unrealizedPL)}
              </div>
              <div className={`text-xs ${isPositive ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                {formatPercent(holding.unrealizedPLPercent)}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'allocationPercent',
        header: () => <div className="text-right">Allocation</div>,
        cell: ({ row }) => {
          const holding = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }}
                />
              </div>
              <span className="text-sm w-12 text-right">{holding.allocationPercent.toFixed(1)}%</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'totalValue',
        header: () => <div className="text-right">Value</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold">
            {formatCurrency(row.original.totalValue)}
          </div>
        ),
      },
    ],
    [onAssetClick]
  );

  const table = useReactTable({
    data: holdings,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    getRowId: (row) => row.symbol,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onAssetClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No holdings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
