'use client';

import * as React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import {
  useFilteredTransactions,
  usePortfolioStore,
} from '@/store/usePortfolioStore';
import { AssetHolding } from '@/types';
import { AssetDetailHeader } from './asset-detail/AssetDetailHeader';
import { AssetValueOverview } from './asset-detail/AssetValueOverview';
import {
  AssetStatsTab,
  type AssetTransactionStats,
} from './asset-detail/AssetStatsTab';
import { AssetTransactionsTab } from './asset-detail/AssetTransactionsTab';
import { EditTransactionDialog } from './asset-detail/EditTransactionDialog';
import { useEditTransactionForm } from './asset-detail/useEditTransactionForm';

const ITEMS_PER_PAGE = 5;

interface AssetDetailSheetProps {
  asset: AssetHolding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetDetailSheet({
  asset,
  open,
  onOpenChange,
}: AssetDetailSheetProps) {
  usePrivacy();
  const transactions = useFilteredTransactions();
  const persons = usePortfolioStore((state) => state.persons);
  const storeTransactions = usePortfolioStore((state) => state.transactions);
  const loadBatch = usePortfolioStore((state) => state.loadBatch);

  const [currentPage, setCurrentPage] = React.useState(0);
  const editForm = useEditTransactionForm();

  // Lazy-load transactions and persons the first time this sheet is opened.
  const didFetch = React.useRef(false);
  React.useEffect(() => {
    if (!open || didFetch.current) return;
    const needed: ('transactions' | 'persons')[] = [];
    if (storeTransactions.length === 0) needed.push('transactions');
    if (persons.length === 0) needed.push('persons');
    if (needed.length > 0) {
      didFetch.current = true;
      loadBatch(needed).catch(console.error);
    }
  }, [open, storeTransactions.length, persons.length, loadBatch]);

  React.useEffect(() => {
    setCurrentPage(0);
  }, [asset?.symbol]);

  const assetTransactions = React.useMemo(() => {
    if (!asset) return [];
    return transactions
      .filter((t) => t.assetSymbol === asset.symbol)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, asset]);

  const totalPages = Math.ceil(assetTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = React.useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE;
    return assetTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [assetTransactions, currentPage]);

  const transactionStats = React.useMemo<AssetTransactionStats>(() => {
    let buyCount = 0;
    let sellCount = 0;
    let totalBought = 0;
    let totalSold = 0;
    for (const t of assetTransactions) {
      const value = Number(t.quantity) * Number(t.pricePerUnit);
      if (t.type === 'BUY') {
        buyCount += 1;
        totalBought += value;
      } else {
        sellCount += 1;
        totalSold += value;
      }
    }
    return { buyCount, sellCount, totalBought, totalSold };
  }, [assetTransactions]);

  if (!asset) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto px-8">
          <AssetDetailHeader asset={asset} />

          <div className="space-y-6">
            <AssetValueOverview asset={asset} />

            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="transactions" className="flex-1">
                  Transactions ({assetTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex-1">
                  Statistics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="mt-4">
                <AssetTransactionsTab
                  asset={asset}
                  transactions={paginatedTransactions}
                  page={currentPage}
                  pageCount={totalPages}
                  onPageChange={setCurrentPage}
                  onEditTransaction={editForm.openFor}
                />
              </TabsContent>

              <TabsContent value="stats" className="mt-4 space-y-4 pb-4">
                <AssetStatsTab type={asset.type} stats={transactionStats} />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <EditTransactionDialog form={editForm} />
    </>
  );
}
