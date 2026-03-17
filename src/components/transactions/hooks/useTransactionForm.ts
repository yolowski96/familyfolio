'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePortfolioStore, DbPerson } from '@/store/usePortfolioStore';
import { AssetType } from '@/types';
import { format } from 'date-fns';

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  assetType?: AssetType;
  exchange?: string;
  id?: string;
  quantity?: number;
}

export interface TransactionFormState {
  personId: string;
  assetType: AssetType;
  transactionType: 'BUY' | 'SELL';
  symbol: string;
  assetName: string;
  quantity: string;
  pricePerUnit: string;
  totalAmount: string;
  date: string;
}

export interface UseTransactionFormReturn {
  // Form state
  formState: TransactionFormState;
  isSaving: boolean;
  
  // Setters
  setPersonId: (id: string) => void;
  setAssetType: (type: AssetType) => void;
  setTransactionType: (type: 'BUY' | 'SELL') => void;
  setSymbol: (symbol: string) => void;
  setAssetName: (name: string) => void;
  setDate: (date: string) => void;
  
  // Handlers
  handlePricePerUnitChange: (value: string) => void;
  handleQuantityChange: (value: string) => void;
  handleTotalAmountChange: (value: string) => void;
  handleSelectAsset: (result: SearchResult) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  
  // Computed
  existingHoldings: Array<{ symbol: string; name: string; type: AssetType; quantity: number }>;
  selectedHolding: { symbol: string; name: string; type: AssetType; quantity: number } | null;
  isValid: boolean;
  
  // Store data
  persons: DbPerson[];
}

export interface InitialAssetData {
  assetType: AssetType;
  symbol: string;
  assetName: string;
}

export function useTransactionForm(
  onSuccess?: () => void,
  initialAsset?: InitialAssetData,
): UseTransactionFormReturn {
  const persons = usePortfolioStore((state) => state.persons);
  const transactions = usePortfolioStore((state) => state.transactions);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);
  const addTransactionAction = usePortfolioStore((state) => state.addTransaction);
  const loadPersons = usePortfolioStore((state) => state.loadPersons);

  // Form state
  const [personId, setPersonId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('STOCK');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState('');
  const [assetName, setAssetName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [lastEdited, setLastEdited] = useState<'quantity' | 'total' | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);

  // Track previous values for reset logic
  const isInitialMount = useRef(true);
  const prevTransactionType = useRef(transactionType);
  const prevPersonId = useRef(personId);

  // Calculate existing holdings for the selected person (for SELL mode)
  const existingHoldings = useMemo(() => {
    if (!personId) return [];

    const personTransactions = transactions.filter(t => t.personId === personId);
    const holdingsMap = new Map<string, {
      symbol: string;
      name: string;
      type: AssetType;
      quantity: number;
    }>();

    for (const tx of personTransactions) {
      const existing = holdingsMap.get(tx.assetSymbol);
      const quantityDelta = tx.type === 'BUY' ? Number(tx.quantity) : -Number(tx.quantity);

      if (existing) {
        existing.quantity += quantityDelta;
      } else {
        holdingsMap.set(tx.assetSymbol, {
          symbol: tx.assetSymbol,
          name: tx.assetName,
          type: tx.assetType,
          quantity: quantityDelta,
        });
      }
    }

    return Array.from(holdingsMap.values()).filter(h => h.quantity > 0);
  }, [personId, transactions]);

  const selectedHolding = transactionType === 'SELL'
    ? existingHoldings.find(h => h.symbol === symbol) ?? null
    : null;

  // Reset when switching transaction type or person
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevTransactionType.current = transactionType;
      prevPersonId.current = personId;
      return;
    }

    if (prevTransactionType.current !== transactionType || prevPersonId.current !== personId) {
      if (initialAsset) {
        setSymbol(initialAsset.symbol);
        setAssetName(initialAsset.assetName);
        setAssetType(initialAsset.assetType);
      } else {
        setSymbol('');
        setAssetName('');
      }
      setQuantity('');
      setPricePerUnit('');
      setTotalAmount('');
      setLastEdited(null);
      prevTransactionType.current = transactionType;
      prevPersonId.current = personId;
    }
  }, [transactionType, personId, initialAsset]);

  const resetForm = useCallback(() => {
    setSymbol('');
    setAssetName('');
    setQuantity('');
    setPricePerUnit('');
    setTotalAmount('');
    setLastEdited(null);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTransactionType('BUY');
    setAssetType('STOCK');
    setIsSaving(false);
  }, []);

  const initializeForm = useCallback(() => {
    if (persons.length === 0) {
      loadPersons().catch(console.error);
    }
    resetForm();
    const selectedPerson = activePersonId !== 'ALL'
      ? activePersonId
      : persons[0]?.id || '';
    setPersonId(selectedPerson);

    if (initialAsset) {
      setAssetType(initialAsset.assetType);
      setSymbol(initialAsset.symbol);
      setAssetName(initialAsset.assetName);
    }

    isInitialMount.current = true;
  }, [persons, activePersonId, loadPersons, resetForm, initialAsset]);

  // Auto-calculate handlers
  const handlePricePerUnitChange = useCallback((value: string) => {
    setPricePerUnit(value);
    const price = parseFloat(value);
    if (!isNaN(price) && price > 0) {
      if (lastEdited === 'total' && totalAmount) {
        const total = parseFloat(totalAmount);
        if (!isNaN(total)) {
          setQuantity((total / price).toString());
        }
      } else if (lastEdited === 'quantity' && quantity) {
        const qty = parseFloat(quantity);
        if (!isNaN(qty)) {
          setTotalAmount((qty * price).toFixed(2));
        }
      }
    }
  }, [lastEdited, totalAmount, quantity]);

  const handleQuantityChange = useCallback((value: string) => {
    setQuantity(value);
    setLastEdited('quantity');
    const qty = parseFloat(value);
    const price = parseFloat(pricePerUnit);
    if (!isNaN(qty) && !isNaN(price) && price > 0) {
      setTotalAmount((qty * price).toFixed(2));
    } else if (value === '') {
      setTotalAmount('');
    }
  }, [pricePerUnit]);

  const handleTotalAmountChange = useCallback((value: string) => {
    setTotalAmount(value);
    setLastEdited('total');
    const total = parseFloat(value);
    const price = parseFloat(pricePerUnit);
    if (!isNaN(total) && !isNaN(price) && price > 0) {
      setQuantity((total / price).toString());
    } else if (value === '') {
      setQuantity('');
    }
  }, [pricePerUnit]);

  const handleSelectAsset = useCallback((result: SearchResult) => {
    setSymbol(result.symbol);
    setAssetName(result.name);

    if (result.assetType) {
      setAssetType(result.assetType);
    } else if (result.type) {
      if (result.type === 'CRYPTOCURRENCY' || result.type === 'CRYPTO') {
        setAssetType('CRYPTO');
      } else if (result.type === 'ETF') {
        setAssetType('ETF');
      } else {
        setAssetType('STOCK');
      }
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!personId || !symbol || !assetName || !quantity || !pricePerUnit) {
      return;
    }

    if (transactionType === 'SELL') {
      const holding = existingHoldings.find(h => h.symbol === symbol);
      if (!holding || parseFloat(quantity) > holding.quantity) {
        alert(`Cannot sell more than you own (${holding?.quantity || 0} ${symbol})`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await addTransactionAction({
        personId,
        assetSymbol: symbol.toUpperCase(),
        assetName,
        assetType,
        type: transactionType,
        quantity: parseFloat(quantity),
        pricePerUnit: parseFloat(pricePerUnit),
        date: date,
      });

      resetForm();
      onSuccess?.();
    } finally {
      setIsSaving(false);
    }
  }, [personId, symbol, assetName, quantity, pricePerUnit, transactionType, existingHoldings, assetType, date, addTransactionAction, resetForm, onSuccess]);

  const isValid = Boolean(personId && symbol && assetName && quantity && pricePerUnit);

  return {
    formState: {
      personId,
      assetType,
      transactionType,
      symbol,
      assetName,
      quantity,
      pricePerUnit,
      totalAmount,
      date,
    },
    isSaving,
    setPersonId: (id: string) => {
      setPersonId(id);
      if (initialAsset) {
        setSymbol(initialAsset.symbol);
        setAssetName(initialAsset.assetName);
      } else {
        setSymbol('');
        setAssetName('');
      }
    },
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
    resetForm: initializeForm,
    existingHoldings,
    selectedHolding,
    isValid,
    persons,
  };
}
