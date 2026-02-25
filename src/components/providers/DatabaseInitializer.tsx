'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface DatabaseInitializerProps {
  children: React.ReactNode;
}

/**
 * DatabaseInitializer
 * 
 * Initializes the database store by loading all data from the API.
 * Place this component high in your component tree to ensure data
 * is loaded before other components try to access it.
 * 
 * Usage:
 * ```tsx
 * <DatabaseInitializer>
 *   <YourApp />
 * </DatabaseInitializer>
 * ```
 */
export function DatabaseInitializer({ children }: DatabaseInitializerProps) {
  const loadAll = usePortfolioStore((state) => state.loadAll);
  const isInitialized = usePortfolioStore((state) => state.isInitialized);
  const error = usePortfolioStore((state) => state.error);

  useEffect(() => {
    if (!isInitialized) {
      loadAll();
    }
  }, [isInitialized, loadAll]);

  // You can optionally show a loading state here
  // For now, we render children immediately and let components
  // handle their own loading states
  
  if (error) {
    console.error('Database initialization error:', error);
  }

  return <>{children}</>;
}

/**
 * Hook to check if database is ready
 */
export function useDatabaseReady(): boolean {
  return usePortfolioStore((state) => state.isInitialized);
}

/**
 * Hook to get database loading state
 */
export function useDatabaseLoading(): boolean {
  return usePortfolioStore((state) => state.isLoading);
}

/**
 * Hook to get database error
 */
export function useDatabaseError(): string | null {
  return usePortfolioStore((state) => state.error);
}
