'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setPrivacyMode } from '@/lib/utils';

type PrivacyContextType = {
  isPrivate: boolean;
  toggle: () => void;
  mask: (value: string) => string;
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => setPrivacyMode(isPrivate), [isPrivate]);

  const toggle = useCallback(() => {
    setIsPrivate((p) => {
      const next = !p;
      setPrivacyMode(next); // Sync update so consumers see new value on re-render
      return next;
    });
  }, []);

  const mask = useCallback(
    (value: string) => (isPrivate ? '•••••' : value),
    [isPrivate]
  );

  return (
    <PrivacyContext.Provider value={{ isPrivate, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
}
