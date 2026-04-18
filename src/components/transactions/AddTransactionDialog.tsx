'use client';

import { useEffect, useState } from 'react';
import { IconLoader2, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssetType } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import {
  useTransactionForm,
  type InitialAssetData,
} from './hooks/useTransactionForm';
import { AssetSearchInput } from './AssetSearchInput';
import { TransactionTypeToggle } from './add-transaction/TransactionTypeToggle';
import { TransactionAmountFields } from './add-transaction/TransactionAmountFields';

interface AddTransactionDialogProps {
  children?: React.ReactNode;
  initialAsset?: InitialAssetData;
}

const PRIMARY_BUTTON_CLASSES =
  'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-emerald-500/20';
const SELL_BUTTON_CLASSES =
  'bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white';
const BUY_BUTTON_CLASSES =
  'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white';

export function AddTransactionDialog({
  children,
  initialAsset,
}: AddTransactionDialogProps) {
  usePrivacy();
  const [open, setOpen] = useState(false);

  const {
    formState,
    isSaving,
    setPersonId,
    setAssetType,
    setTransactionType,
    setSymbol,
    setAssetName,
    setDate,
    handlePricePerUnitChange,
    handleQuantityChange,
    handleTotalAmountChange,
    handleSelectAsset,
    handleSubmit,
    resetForm,
    existingHoldings,
    selectedHolding,
    isValid,
    persons,
  } = useTransactionForm(() => setOpen(false), initialAsset);

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const {
    personId,
    assetType,
    transactionType,
    symbol,
    assetName,
    quantity,
    pricePerUnit,
    totalAmount,
    date,
  } = formState;

  return (
    <Dialog open={open} onOpenChange={(value) => !isSaving && setOpen(value)}>
      <DialogTrigger asChild>
        {children || (
          <Button className={PRIMARY_BUTTON_CLASSES}>
            <IconPlus className="size-4 mr-2" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            New Transaction
          </DialogTitle>
          <DialogDescription>
            Record a buy or sell transaction for your portfolio.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="grid gap-5 py-4 overflow-y-auto flex-1 pr-2">
            <div className="grid gap-2">
              <Label htmlFor="person">Person</Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TransactionTypeToggle
              transactionType={transactionType}
              onChange={setTransactionType}
              sellDisabled={existingHoldings.length === 0}
              showSellHint={existingHoldings.length === 0 && !!personId}
            />

            {transactionType === 'BUY' && (
              <div className="grid gap-2">
                <Label htmlFor="assetType">Asset Type</Label>
                <Select
                  value={assetType}
                  onValueChange={(v) => setAssetType(v as AssetType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCK">Stock</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                    <SelectItem value="ETF">ETF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <AssetSearchInput
              transactionType={transactionType}
              assetType={assetType}
              existingHoldings={existingHoldings}
              onSelectAsset={handleSelectAsset}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., BTC, AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="uppercase"
                  readOnly={transactionType === 'SELL'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assetName">Asset Name</Label>
                <Input
                  id="assetName"
                  placeholder="e.g., Bitcoin"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  readOnly={transactionType === 'SELL'}
                />
              </div>
            </div>

            {transactionType === 'SELL' && selectedHolding && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Available to sell
                  </span>
                  <span className="font-medium">
                    {selectedHolding.quantity.toLocaleString()}{' '}
                    {selectedHolding.symbol}
                  </span>
                </div>
              </div>
            )}

            <TransactionAmountFields
              pricePerUnit={pricePerUnit}
              quantity={quantity}
              totalAmount={totalAmount}
              onPriceChange={handlePricePerUnitChange}
              onQuantityChange={handleQuantityChange}
              onTotalAmountChange={handleTotalAmountChange}
              maxQuantity={
                transactionType === 'SELL' && selectedHolding
                  ? selectedHolding.quantity
                  : undefined
              }
            />

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {totalAmount && parseFloat(totalAmount) > 0 && (
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Value</span>
                  <span
                    className={cn(
                      'text-xl font-semibold',
                      transactionType === 'SELL' ? 'text-emerald-500' : ''
                    )}
                  >
                    {transactionType === 'SELL' ? '+' : ''}
                    {formatCurrency(parseFloat(totalAmount))}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSaving}
              className={
                transactionType === 'SELL'
                  ? SELL_BUTTON_CLASSES
                  : BUY_BUTTON_CLASSES
              }
            >
              {isSaving ? (
                <>
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : transactionType === 'SELL' ? (
                'Sell Asset'
              ) : (
                'Add Transaction'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
