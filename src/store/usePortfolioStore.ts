import { create } from 'zustand';
import { useMemo } from 'react';
import { AssetType } from '@/types';

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

export interface DbGoal {
  id: string;
  personId?: string | null;
  name: string;
  type: 'PORTFOLIO_VALUE' | 'MONTHLY_INVESTMENT' | 'ASSET_TARGET' | 'DIVERSIFICATION';
  targetValue: number | string;
  currentValue: number | string;
  deadline?: string | null;
  assetSymbol?: string | null;
  assetType?: AssetType | null;
  isCompleted: boolean;
  createdAt: string;
  person?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface PortfolioState {
  // Data
  persons: DbPerson[];
  transactions: DbTransaction[];
  holdings: DbHolding[];
  goals: DbGoal[];
  
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
  
  // Goal Actions
  loadGoals: () => Promise<void>;
  addGoal: (goal: Omit<DbGoal, 'id' | 'createdAt' | 'isCompleted' | 'currentValue' | 'person'>) => Promise<DbGoal | null>;
  updateGoal: (id: string, updates: Partial<DbGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  
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
  goals: [],
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
      // Reload holdings with new prices
      await get().loadHoldings();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating prices:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update prices', 
        isLoading: false 
      });
    }
  },
  
  // =========================================================================
  // GOAL ACTIONS
  // =========================================================================
  
  loadGoals: async () => {
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load goals');
      }
      const goals = await response.json();
      set({ goals });
    } catch (error) {
      console.error('Error loading goals:', error);
      throw error;
    }
  },
  
  addGoal: async (goal) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create goal');
      }
      const newGoal = await response.json();
      set({
        goals: [newGoal, ...get().goals],
        isLoading: false,
      });
      return newGoal;
    } catch (error) {
      console.error('Error creating goal:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create goal', 
        isLoading: false 
      });
      return null;
    }
  },
  
  updateGoal: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update goal');
      }
      const updatedGoal = await response.json();
      set({
        goals: get().goals.map(g => g.id === id ? updatedGoal : g),
        isLoading: false,
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update goal', 
        isLoading: false 
      });
    }
  },
  
  deleteGoal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete goal');
      }
      set({
        goals: get().goals.filter(g => g.id !== id),
        isLoading: false,
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete goal', 
        isLoading: false 
      });
    }
  },
  
  // =========================================================================
  // UTILITY ACTIONS
  // =========================================================================
  
  loadAll: async () => {
    if (get().isLoading) return;
    
    set({ isLoading: true, error: null });
    try {
      await get().loadBatch(['holdings', 'persons']);
      set({ isLoading: false, isInitialized: true });
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
    goals: [],
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

/**
 * Get filtered goals based on active person
 */
export function useFilteredGoals(): DbGoal[] {
  const goals = usePortfolioStore((state) => state.goals);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);

  return useMemo(() => {
    if (activePersonId === 'ALL') {
      return goals;
    }
    return goals.filter((g) => g.personId === activePersonId || g.personId === null);
  }, [goals, activePersonId]);
}

/**
 * Calculate portfolio summary from holdings
 */
export function usePortfolioSummary() {
  const holdings = useFilteredHoldings();

  return useMemo(() => {
    let totalValue = 0;
    let totalInvested = 0;

    const holdingsByType = new Map<AssetType, number>();

    for (const holding of holdings) {
      const currentValue = Number(holding.currentValue) || 0;
      const invested = Number(holding.totalInvested) || 0;

      totalValue += currentValue;
      totalInvested += invested;

      const typeValue = holdingsByType.get(holding.assetType) || 0;
      holdingsByType.set(holding.assetType, typeValue + currentValue);
    }

    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    // Find top performer
    const topPerformer = holdings.reduce<DbHolding | null>((top, current) => {
      if (!top) return current;
      const topPL = Number(top.profitLossPercent) || 0;
      const currentPL = Number(current.profitLossPercent) || 0;
      return currentPL > topPL ? current : top;
    }, null);

    // Allocation by type
    const allocationByType = Array.from(holdingsByType.entries()).map(([type, value]) => ({
      type,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));

    return {
      totalBalance: totalValue,
      totalInvested,
      totalPL,
      totalPLPercent,
      topPerformer,
      holdings,
      allocationByType,
    };
  }, [holdings]);
}

// Legacy alias for backward compatibility
export const useDatabaseStore = usePortfolioStore;
