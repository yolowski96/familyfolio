'use client';

import { useCallback, useState } from 'react';
import { usePortfolioStore, DbTransaction } from '@/store/usePortfolioStore';

type LastEdited = 'quantity' | 'total' | null;

/**
 * Form state + derived handlers for editing an existing transaction inside
 * the asset detail sheet. Kept in its own hook so the big sheet component
 * doesn't carry 8 `useState` calls on top of everything else.
 */
export function useEditTransactionForm() {
  const updateTransactionAction = usePortfolioStore((s) => s.updateTransaction);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DbTransaction | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [lastEdited, setLastEdited] = useState<LastEdited>(null);
  const [date, setDate] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');

  const openFor = useCallback((tx: DbTransaction) => {
    const qty = Number(tx.quantity);
    const unitPrice = Number(tx.pricePerUnit);
    setEditing(tx);
    setQuantity(qty.toString());
    setPrice(unitPrice.toString());
    setTotalAmount((qty * unitPrice).toFixed(2));
    setLastEdited(null);
    setDate(tx.date.split('T')[0]);
    setType(tx.type);
    setOpen(true);
  }, []);

  const handlePriceChange = useCallback(
    (value: string) => {
      setPrice(value);
      const nextPrice = parseFloat(value);
      if (!isNaN(nextPrice) && nextPrice > 0) {
        if (lastEdited === 'total' && totalAmount) {
          const total = parseFloat(totalAmount);
          if (!isNaN(total)) setQuantity((total / nextPrice).toString());
        } else if (lastEdited === 'quantity' && quantity) {
          const qty = parseFloat(quantity);
          if (!isNaN(qty)) setTotalAmount((qty * nextPrice).toFixed(2));
        }
      }
    },
    [lastEdited, totalAmount, quantity]
  );

  const handleQuantityChange = useCallback(
    (value: string) => {
      setQuantity(value);
      setLastEdited('quantity');
      const qty = parseFloat(value);
      const unitPrice = parseFloat(price);
      if (!isNaN(qty) && !isNaN(unitPrice) && unitPrice > 0) {
        setTotalAmount((qty * unitPrice).toFixed(2));
      } else if (value === '') {
        setTotalAmount('');
      }
    },
    [price]
  );

  const handleTotalAmountChange = useCallback(
    (value: string) => {
      setTotalAmount(value);
      setLastEdited('total');
      const total = parseFloat(value);
      const unitPrice = parseFloat(price);
      if (!isNaN(total) && !isNaN(unitPrice) && unitPrice > 0) {
        setQuantity((total / unitPrice).toString());
      } else if (value === '') {
        setQuantity('');
      }
    },
    [price]
  );

  const save = useCallback(async () => {
    if (!editing) return;
    await updateTransactionAction(editing.id, {
      quantity: parseFloat(quantity),
      pricePerUnit: parseFloat(price),
      date,
      type,
    });
    setOpen(false);
    setEditing(null);
  }, [editing, quantity, price, date, type, updateTransactionAction]);

  const canSave = Boolean(quantity && price && date);

  return {
    open,
    setOpen,
    quantity,
    price,
    totalAmount,
    date,
    setDate,
    type,
    setType,
    handlePriceChange,
    handleQuantityChange,
    handleTotalAmountChange,
    openFor,
    save,
    canSave,
  };
}

export type UseEditTransactionFormReturn = ReturnType<typeof useEditTransactionForm>;
