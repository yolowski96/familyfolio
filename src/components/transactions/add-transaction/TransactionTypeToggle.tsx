'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TransactionTypeToggleProps {
  transactionType: 'BUY' | 'SELL';
  onChange: (type: 'BUY' | 'SELL') => void;
  sellDisabled: boolean;
  showSellHint: boolean;
}

/**
 * Buy/Sell pill pair plus the "no assets to sell" empty-state hint, used by
 * the Add Transaction dialog.
 */
export function TransactionTypeToggle({
  transactionType,
  onChange,
  sellDisabled,
  showSellHint,
}: TransactionTypeToggleProps) {
  return (
    <div className="grid gap-2">
      <Label>Transaction Type</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={transactionType === 'BUY' ? 'default' : 'outline'}
          onClick={() => onChange('BUY')}
          className={
            transactionType === 'BUY'
              ? 'flex-1 bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'flex-1'
          }
        >
          Buy
        </Button>
        <Button
          type="button"
          variant={transactionType === 'SELL' ? 'default' : 'outline'}
          onClick={() => onChange('SELL')}
          className={
            transactionType === 'SELL'
              ? 'flex-1 bg-rose-600 hover:bg-rose-500 text-white'
              : 'flex-1'
          }
          disabled={sellDisabled}
        >
          Sell
        </Button>
      </div>
      {showSellHint && (
        <p className="text-xs text-muted-foreground">
          No assets to sell for this person yet.
        </p>
      )}
    </div>
  );
}
