'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { UseEditTransactionFormReturn } from './useEditTransactionForm';

interface EditTransactionDialogProps {
  form: UseEditTransactionFormReturn;
}

export function EditTransactionDialog({ form }: EditTransactionDialogProps) {
  return (
    <Dialog open={form.open} onOpenChange={form.setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the details of this transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="editType">Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => form.setType(v as 'BUY' | 'SELL')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editPrice">Price per Unit (EUR)</Label>
            <Input
              id="editPrice"
              type="number"
              step="any"
              value={form.price}
              onChange={(e) => form.handlePriceChange(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="editQuantity">Quantity</Label>
              <Input
                id="editQuantity"
                type="number"
                step="any"
                value={form.quantity}
                onChange={(e) => form.handleQuantityChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculates with total
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editTotalAmount">Total Amount (EUR)</Label>
              <Input
                id="editTotalAmount"
                type="number"
                step="any"
                value={form.totalAmount}
                onChange={(e) => form.handleTotalAmountChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Total = Quantity x Price
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editDate">Date</Label>
            <Input
              id="editDate"
              type="date"
              value={form.date}
              onChange={(e) => form.setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => form.setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={form.save} disabled={!form.canSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
