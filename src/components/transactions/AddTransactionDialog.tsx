'use client';

import { useState, useEffect } from 'react';
import { IconPlus, IconLoader2 } from '@tabler/icons-react';
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
import { useTransactionForm, InitialAssetData } from './hooks/useTransactionForm';
import { AssetSearchInput } from './AssetSearchInput';

interface AddTransactionDialogProps {
  children?: React.ReactNode;
  initialAsset?: InitialAssetData;
}

export function AddTransactionDialog({ children, initialAsset }: AddTransactionDialogProps) {
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      resetForm();
    }
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
          <Button 
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-emerald-500/20"
          >
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-5 py-4 overflow-y-auto flex-1 pr-2">
            {/* Person Selection */}
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

            {/* Transaction Type */}
            <div className="grid gap-2">
              <Label>Transaction Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={transactionType === 'BUY' ? 'default' : 'outline'}
                  onClick={() => setTransactionType('BUY')}
                  className={transactionType === 'BUY' 
                    ? 'flex-1 bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'flex-1'
                  }
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={transactionType === 'SELL' ? 'default' : 'outline'}
                  onClick={() => setTransactionType('SELL')}
                  className={transactionType === 'SELL' 
                    ? 'flex-1 bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'flex-1'
                  }
                  disabled={existingHoldings.length === 0}
                >
                  Sell
                </Button>
              </div>
              {transactionType === 'BUY' && existingHoldings.length === 0 && personId && (
                <p className="text-xs text-muted-foreground">No assets to sell for this person yet.</p>
              )}
            </div>

            {/* Asset Type - Only show for BUY */}
            {transactionType === 'BUY' && (
              <div className="grid gap-2">
                <Label htmlFor="assetType">Asset Type</Label>
                <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
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

            {/* Asset Search */}
            <AssetSearchInput
              transactionType={transactionType}
              assetType={assetType}
              existingHoldings={existingHoldings}
              onSelectAsset={handleSelectAsset}
            />

            {/* Symbol and Name */}
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

            {/* Show available quantity for SELL */}
            {transactionType === 'SELL' && selectedHolding && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available to sell</span>
                  <span className="font-medium">{selectedHolding.quantity.toLocaleString()} {selectedHolding.symbol}</span>
                </div>
              </div>
            )}

            {/* Price per Unit */}
            <div className="grid gap-2">
              <Label htmlFor="price">Price per Unit (EUR)</Label>
              <Input
                id="price"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={pricePerUnit}
                onChange={(e) => handlePricePerUnitChange(e.target.value)}
              />
            </div>

            {/* Quantity and Total Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  max={transactionType === 'SELL' && selectedHolding ? selectedHolding.quantity : undefined}
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter quantity or total to auto-calculate
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalAmount">Total Amount (EUR)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Total = Quantity × Price
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Total Preview */}
            {totalAmount && parseFloat(totalAmount) > 0 && (
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className={cn(
                    "text-xl font-semibold",
                    transactionType === 'SELL' ? "text-emerald-500" : ""
                  )}>
                    {transactionType === 'SELL' ? '+' : ''}{formatCurrency(parseFloat(totalAmount))}
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
              className={transactionType === 'SELL' 
                ? "bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white"
                : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white"
              }
            >
              {isSaving ? (
                <>
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                transactionType === 'SELL' ? 'Sell Asset' : 'Add Transaction'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
