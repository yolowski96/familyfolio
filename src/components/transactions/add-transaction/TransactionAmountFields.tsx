'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TransactionAmountFieldsProps {
  pricePerUnit: string;
  quantity: string;
  totalAmount: string;
  onPriceChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onTotalAmountChange: (value: string) => void;
  /** Optional max quantity for SELL mode. */
  maxQuantity?: number;
}

/**
 * Price/Quantity/Total triplet shared by the Add Transaction dialog. Keeps
 * the auto-calculation wiring in one place.
 */
export function TransactionAmountFields({
  pricePerUnit,
  quantity,
  totalAmount,
  onPriceChange,
  onQuantityChange,
  onTotalAmountChange,
  maxQuantity,
}: TransactionAmountFieldsProps) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="price">Price per Unit (EUR)</Label>
        <Input
          id="price"
          type="number"
          step="any"
          min="0"
          placeholder="0.00"
          value={pricePerUnit}
          onChange={(e) => onPriceChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            step="any"
            min="0"
            max={maxQuantity}
            placeholder="0.00"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
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
            onChange={(e) => onTotalAmountChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Total = Quantity x Price
          </p>
        </div>
      </div>
    </>
  );
}
