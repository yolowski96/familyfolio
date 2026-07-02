'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import { useBootstrap } from '@/lib/queries/bootstrap';

/**
 * Reacts to auth state changes:
 *   - When a user signs in, kicks off the bootstrap query which seeds the
 *     TanStack cache for persons/transactions/holdings/live-prices in one
 *     round-trip.
 *   - When a user signs out, clears the query cache so no stale data from
 *     the previous session leaks into a new one.
 */
export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const prevUserId = useRef<string | null>(null);

  useBootstrap(Boolean(user) && !authLoading);

  useEffect(() => {
    if (authLoading) return;
    const currentUserId = user?.id ?? null;

    if (!currentUserId && prevUserId.current) {
      queryClient.clear();
    }
    prevUserId.current = currentUserId;
  }, [user, authLoading, queryClient]);

  return <>{children}</>;
}
