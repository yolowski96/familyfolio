import { create } from 'zustand';
import { useMemo } from 'react';
import { AssetType, PriceData } from '@/types';

// =============================================================================
// DATABASE-BACKED STORE TYPES
// =============================================================================

export interface DbPerson {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbTransaction {
  id: string;
  personId: string;
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  type: 'BUY' | 'SELL';
  quantity: number | string;
  pricePerUnit: number | string;
  totalAmount: number | string;
  currency: string;
  fee: number | string;
  date: string;
  exchange?: string;
  notes?: string;
  person?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface DbHolding {
  id: string;
  personId: string;
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  quantity: number | string;
  averagePrice: number | string;
  totalInvested: number | string;
  currentPrice?: number | string | null;
  currentValue?: number | string | null;
  profitLoss?: number | string | null;
  profitLossPercent?: number | string | null;
  currency: string;
  lastPriceUpdate?: string | null;
  person?: {
    id: string;
    name: string;
    color: string;
  };
  asset?: {
    symbol: string;
    name: string;
    type: AssetType;
  };
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface PortfolioState {
  // Data
  persons: DbPerson[];
  transactions: DbTransaction[];
  holdings: DbHolding[];

  // Live (EUR-converted) prices keyed by asset symbol. Populated by the
  // dashboard endpoint and `refreshLivePrices`. Used by the summary
  // calculator to render instantly without waiting on a separate
  // `/api/prices` round-trip.
  livePrices: Record<string, PriceData>;
  livePricesUpdatedAt: number | null;

  // UI State
  activePersonId: string | 'ALL';
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Person Actions
  loadPersons: () => Promise<void>;
  addPerson: (name: string, color: string) => Promise<DbPerson | null>;
  updatePerson: (id: string, updates: { name?: string; color?: string; isDefault?: boolean }) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  setActivePerson: (id: string | 'ALL') => void;
  setDefaultPerson: (id: string) => Promise<void>;

  // Transaction Actions
  loadTransactions: (personId?: string) => Promise<void>;
  addTransaction: (transaction: Omit<DbTransaction, 'id' | 'person' | 'totalAmount' | 'currency' | 'fee'> & { totalAmount?: number | string; currency?: string; fee?: number | string }) => Promise<DbTransaction | null>;
  updateTransaction: (id: string, updates: Partial<DbTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Holding Actions
  loadHoldings: (personId?: string) => Promise<void>;
  refreshPrices: () => Promise<void>;
  refreshLivePrices: () => Promise<void>;

  // Utility Actions
  loadAll: () => Promise<void>;
  loadBatch: (parts: ('transactions' | 'persons' | 'holdings')[]) => Promise<void>;
  clearError: () => void;
  resetStore: () => void;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

const inflightBatch = new Map<string, Promise<void>>();

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  // Initial state
  persons: [],
  transactions: [],
  holdings: [],
  livePrices: {},
  livePricesUpdatedAt: null,
  activePersonId: 'ALL',
  isLoading: false,
  error: null,
  isInitialized: false,
  
  // =========================================================================
  // PERSON ACTIONS
  // =========================================================================
  
  loadPersons: async () => {
    try {
      const response = await fetch('/api/persons');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load persons');
      }
      const persons = await response.json();
      set({ persons });
    } catch (error) {
      console.error('Error loading persons:', error);
      throw error;
    }
  },
  
  addPerson: async (name, color) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create person');
      }
      const person = await response.json();
      set({ 
        persons: [...get().persons, person], 
        isLoading: false 
      });
      return person;
    } catch (error) {
      console.error('Error creating person:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create person', 
        isLoading: false 
      });
      return null;
    }
  },
  
  updatePerson: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/persons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update person');
      }
      const updatedPerson = await response.json();
      set({
        persons: get().persons.map(p => p.id === id ? updatedPerson : p),
        isLoading: false,
      });
    } catch (error) {
      console.error('Error updating person:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update person', 
        isLoading: false 
      });
    }
  },
  
  deletePerson: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/persons/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete person');
      }
      const state = get();
      set({
        persons: state.persons.filter(p => p.id !== id),
        transactions: state.transactions.filter(t => t.personId !== id),
        holdings: state.holdings.filter(h => h.personId !== id),
        activePersonId: state.activePersonId === id ? 'ALL' : state.activePersonId,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error deleting person:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete person', 
        isLoading: false 
      });
    }
  },
  
  setActivePerson: (id) => set({ activePersonId: id }),
  
  setDefaultPerson: async (id) => {
    await get().updatePerson(id, { isDefault: true });
    // Reload to get updated isDefault flags
    await get().loadPersons();
  },
  
  // =========================================================================
  // TRANSACTION ACTIONS
  // =========================================================================
  
  loadTransactions: async (personId?: string) => {
    try {
      const url = personId 
        ? `/api/transactions?personId=${personId}`
        : '/api/transactions';
      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load transactions');
      }
      const transactions = await response.json();
      set({ transactions });
    } catch (error) {
      console.error('Error loading transactions:', error);
      throw error;
    }
  },
  
  addTransaction: async (transaction) => {
    set({ isLoading: true, error: null });
    try {
      // Compute missing fields if not provided
      const qty = Number(transaction.quantity) || 0;
      const price = Number(transaction.pricePerUnit) || 0;
      const payload = {
        ...transaction,
        totalAmount: transaction.totalAmount ?? qty * price,
        currency: transaction.currency ?? 'EUR',
        fee: transaction.fee ?? 0,
      };
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create transaction');
      }
      const { transaction: newTransaction } = await response.json();
      set({
        transactions: [newTransaction, ...get().transactions],
        isLoading: false,
      });
      // Only refresh holdings if they've been loaded (user visited holdings page)
      if (get().holdings.length > 0) {
        get().loadHoldings().catch(err => console.error('Background holdings refresh failed:', err));
      }
      return newTransaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create transaction', 
        isLoading: false 
      });
      return null;
    }
  },
  
  updateTransaction: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update transaction');
      }
      const updatedTransaction = await response.json();
      set({
        transactions: get().transactions.map(t => 
          t.id === id ? updatedTransaction : t
        ),
        isLoading: false,
      });
      // Only refresh holdings if they've been loaded (user visited holdings page)
      if (get().holdings.length > 0) {
        get().loadHoldings().catch(err => console.error('Background holdings refresh failed:', err));
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update transaction', 
        isLoading: false 
      });
    }
  },
  
  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete transaction');
      }
      set({
        transactions: get().transactions.filter(t => t.id !== id),
        isLoading: false,
      });
      // Only refresh holdings if they've been loaded (user visited holdings page)
      if (get().holdings.length > 0) {
        get().loadHoldings().catch(err => console.error('Background holdings refresh failed:', err));
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete transaction', 
        isLoading: false 
      });
    }
  },
  
  // =========================================================================
  // HOLDING ACTIONS
  // =========================================================================
  
  loadHoldings: async (personId?: string) => {
    try {
      const url = personId 
        ? `/api/holdings?personId=${personId}`
        : '/api/holdings';
      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load holdings');
      }
      const holdings = await response.json();
      set({ holdings });
    } catch (error) {
      console.error('Error loading holdings:', error);
      throw error;
    }
  },
  
  refreshPrices: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/holdings?action=update-prices', {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update prices');
      }
      // Reload holdings with new prices, and refresh the in-memory live price
      // map so the summary picks up the new values.
      await Promise.all([
        get().loadHoldings(),
        get().refreshLivePrices(),
      ]);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating prices:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to update prices',
        isLoading: false
      });
    }
  },

  refreshLivePrices: async () => {
    const holdings = get().holdings;
    if (holdings.length === 0) {
      set({ livePrices: {}, livePricesUpdatedAt: Date.now() });
      return;
    }

    const uniqueAssets = new Map<string, { symbol: string; assetType: AssetType }>();
    for (const h of holdings) {
      if (!uniqueAssets.has(h.assetSymbol)) {
        uniqueAssets.set(h.assetSymbol, {
          symbol: h.assetSymbol,
          assetType: h.assetType,
        });
      }
    }

    try {
      const response = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: Array.from(uniqueAssets.values()),
          convertTo: 'EUR',
        }),
      });
      if (!response.ok) {
        console.error('refreshLivePrices: non-OK response', response.status);
        return;
      }
      const livePrices: Record<string, PriceData> = await response.json();
      set({ livePrices, livePricesUpdatedAt: Date.now() });
    } catch (error) {
      console.error('refreshLivePrices failed:', error);
    }
  },
  
  // =========================================================================
  // UTILITY ACTIONS
  // =========================================================================

  loadAll: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        '/api/dashboard?include=holdings,persons,transactions,prices'
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load dashboard data');
      }
      const data = await response.json();
      const updates: Partial<PortfolioState> = {
        isLoading: false,
        isInitialized: true,
      };
      if (data.transactions) updates.transactions = data.transactions;
      if (data.persons) updates.persons = data.persons;
      if (data.holdings) updates.holdings = data.holdings;
      if (data.prices) {
        updates.livePrices = data.prices;
        updates.livePricesUpdatedAt = Date.now();
      }
      set(updates);
    } catch (error) {
      console.error('Error loading all data:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load data',
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  loadBatch: async (parts) => {
    const key = [...parts].sort().join(',');
    const existing = inflightBatch.get(key);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const response = await fetch(`/api/portfolio?include=${parts.join(',')}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load portfolio data');
        }
        const data = await response.json();
        const updates: Partial<PortfolioState> = {};
        if (data.transactions) updates.transactions = data.transactions;
        if (data.persons) updates.persons = data.persons;
        if (data.holdings) updates.holdings = data.holdings;
        set(updates);
      } catch (error) {
        console.error('Error loading batch:', error);
        throw error;
      } finally {
        inflightBatch.delete(key);
      }
    })();

    inflightBatch.set(key, promise);
    return promise;
  },
  
  clearError: () => set({ error: null }),
  
  resetStore: () => set({
    persons: [],
    transactions: [],
    holdings: [],
    livePrices: {},
    livePricesUpdatedAt: null,
    activePersonId: 'ALL',
    isLoading: false,
    error: null,
    isInitialized: false,
  }),
}));

// =============================================================================
// SELECTORS / HOOKS
// =============================================================================

/**
 * Get filtered transactions based on active person
 */
export function useFilteredTransactions(): DbTransaction[] {
  const transactions = usePortfolioStore((state) => state.transactions);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);

  return useMemo(() => {
    if (activePersonId === 'ALL') {
      return transactions;
    }
    return transactions.filter((t) => t.personId === activePersonId);
  }, [transactions, activePersonId]);
}

/**
 * Get filtered holdings based on active person
 */
export function useFilteredHoldings(): DbHolding[] {
  const holdings = usePortfolioStore((state) => state.holdings);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);

  return useMemo(() => {
    if (activePersonId === 'ALL') {
      return holdings;
    }
    return holdings.filter((h) => h.personId === activePersonId);
  }, [holdings, activePersonId]);
}
