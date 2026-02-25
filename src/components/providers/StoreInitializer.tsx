'use client';

import { useEffect, useRef, useState } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { useAuth } from '@/components/providers/AuthProvider';

export function StoreInitializer({ children }: { children: React.ReactNode }) {
  const loadAll = usePortfolioStore((state) => state.loadAll);
  const resetStore = usePortfolioStore((state) => state.resetStore);
  const { user, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const didInit = useRef(false);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading) return;

    const currentUserId = user?.id ?? null;

    if (currentUserId && currentUserId !== prevUserId.current) {
      didInit.current = true;
      prevUserId.current = currentUserId;
      loadAll().catch(console.error);
    }

    if (!currentUserId && prevUserId.current) {
      prevUserId.current = null;
      didInit.current = false;
      resetStore();
    }
  }, [mounted, authLoading, user, loadAll, resetStore]);

  return <>{children}</>;
}
