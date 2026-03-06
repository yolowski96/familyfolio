'use client';

import * as React from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconSortAscending,
  IconTrash,
  IconTrendingUp,
} from '@tabler/icons-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { DbTransaction, DbPerson } from '@/store/usePortfolioStore';
import { AssetType } from '@/types';

const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  STOCK: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  ETF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

const TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  CRYPTO: <IconCurrencyBitcoin className="size-4" />,
  STOCK: <IconCurrencyEuro className="size-4" />,
  ETF: <IconTrendingUp className="size-4" />,
};

interface TransactionsTableProps {
  transactions: DbTransaction[];
  persons: DbPerson[];
  showPersonColumn: boolean;
  onDeleteTransaction: (id: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
}

export function TransactionsTable({
  transactions,
  persons,
  showPersonColumn,
  onDeleteTransaction,
  hasActiveFilters,
  onClearFilters,
  pagination,
  onPaginationChange,
}: TransactionsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const getPersonName = React.useCallback((personId: string) => {
    return persons.find(p => p.id === personId)?.name || 'Unknown';
  }, [persons]);

  const columns: ColumnDef<DbTransaction>[] = React.useMemo(() => {
    const baseColumns: ColumnDef<DbTransaction>[] = [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <IconCalendar className="size-4 text-muted-foreground" />
            <span>{format(parseISO(row.original.date), 'MMM d, yyyy')}</span>
          </div>
        ),
        sortingFn: (a, b) => {
          return new Date(a.original.date).getTime() - new Date(b.original.date).getTime();
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const isBuy = row.original.type === 'BUY';
          return (
            <Badge
              variant="outline"
              className={isBuy
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }
            >
              {isBuy ? (
                <IconArrowDown className="size-3 mr-1" />
              ) : (
                <IconArrowUp className="size-3 mr-1" />
              )}
              {row.original.type}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'assetSymbol',
        header: 'Asset',
        cell: ({ row }) => {
          const tx = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className={`flex size-8 items-center justify-center rounded-lg ${TYPE_COLORS[tx.assetType]}`}>
                {TYPE_ICONS[tx.assetType]}
              </div>
              <div>
                <div className="font-medium">{tx.assetSymbol}</div>
                <div className="text-muted-foreground text-sm">{tx.assetName}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'quantity',
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {formatQuantity(Number(row.original.quantity))}
          </div>
        ),
      },
      {
        accessorKey: 'pricePerUnit',
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => (
          <div className="text-right">
            {formatCurrency(Number(row.original.pricePerUnit))}
          </div>
        ),
      },
      {
        id: 'total',
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => {
          const total = Number(row.original.quantity) * Number(row.original.pricePerUnit);
          const isBuy = row.original.type === 'BUY';
          return (
            <div className={`text-right font-semibold ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isBuy ? '-' : '+'}{formatCurrency(total)}
            </div>
          );
        },
      },
    ];

    if (showPersonColumn) {
      baseColumns.push({
        accessorKey: 'personId',
        header: 'Person',
        cell: ({ row }) => (
          <Badge variant="secondary">
            {getPersonName(row.original.personId)}
          </Badge>
        ),
      });
    }

    baseColumns.push({
      id: 'actions',
      cell: ({ row }) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-rose-500">
              <IconTrash className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this {row.original.type.toLowerCase()} transaction for {row.original.quantity} {row.original.assetSymbol}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDeleteTransaction(row.original.id)}
                className="bg-rose-600 hover:bg-rose-500"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    });

    return baseColumns;
  }, [showPersonColumn, getPersonName, onDeleteTransaction]);

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      onPaginationChange(newPagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <IconSortAscending
                        className={`size-4 ${header.column.getIsSorted() === 'desc' ? 'rotate-180' : ''}`}
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
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
                <div className="flex flex-col items-center gap-2">
                  <IconCalendar className="size-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No transactions found</p>
                  {hasActiveFilters && (
                    <Button variant="link" onClick={onClearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
