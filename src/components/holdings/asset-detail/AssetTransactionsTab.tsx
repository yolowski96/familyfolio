'use client';

import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconPlus,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { usePersonName } from '@/hooks/usePersonName';
import { usePortfolioStore, DbTransaction } from '@/store/usePortfolioStore';
import { AssetHolding } from '@/types';
import { AddTransactionDialog } from '@/components/transactions/AddTransactionDialog';

interface AssetTransactionsTabProps {
  asset: AssetHolding;
  transactions: DbTransaction[];
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onEditTransaction: (tx: DbTransaction) => void;
}

export function AssetTransactionsTab({
  asset,
  transactions,
  page,
  pageCount,
  onPageChange,
  onEditTransaction,
}: AssetTransactionsTabProps) {
  const activePersonId = usePortfolioStore((s) => s.activePersonId);
  const getPersonName = usePersonName();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">
          {transactions.length} transaction
          {transactions.length !== 1 ? 's' : ''}
        </p>
        <AddTransactionDialog
          initialAsset={{
            assetType: asset.type,
            symbol: asset.symbol,
            assetName: asset.name,
          }}
        >
          <Button size="sm" variant="outline" className="gap-1">
            <IconPlus className="size-3" />
            Add
          </Button>
        </AddTransactionDialog>
      </div>

      {transactions.length > 0 ? (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              portfolioName={getPersonName(tx.personId)}
              showPortfolio={activePersonId === 'ALL'}
              onEdit={onEditTransaction}
            />
          ))}
        </div>
      ) : (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <IconCalendar className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No transactions found</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t pb-4">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          aria-label="Previous page"
        >
          <IconChevronLeft className="size-4" />
        </Button>
        <span className="text-muted-foreground text-sm px-2 min-w-[60px] text-center">
          {page + 1} / {pageCount || 1}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          aria-label="Next page"
        >
          <IconChevronRight className="size-4" />
        </Button>
      </div>
    </>
  );
}

interface TransactionRowProps {
  transaction: DbTransaction;
  portfolioName: string;
  showPortfolio: boolean;
  onEdit: (transaction: DbTransaction) => void;
}

function TransactionRow({
  transaction,
  portfolioName,
  showPortfolio,
  onEdit,
}: TransactionRowProps) {
  const isBuy = transaction.type === 'BUY';
  const total = Number(transaction.quantity) * Number(transaction.pricePerUnit);

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${isBuy ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
        >
          {isBuy ? (
            <IconArrowDown className="size-5" />
          ) : (
            <IconArrowUp className="size-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-medium ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {isBuy ? 'Buy' : 'Sell'}
            </span>
            {showPortfolio && (
              <Badge variant="secondary" className="text-xs">
                {portfolioName}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {format(new Date(transaction.date), 'MMM d, yyyy')} •{' '}
            {formatQuantity(Number(transaction.quantity))} @{' '}
            {formatCurrency(Number(transaction.pricePerUnit))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p
              className={`font-medium ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(transaction)}
            aria-label="Edit transaction"
          >
            <IconEdit className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
