'use client';

import { useCallback } from 'react';
import { usePersons } from '@/lib/queries';

/**
 * Stable lookup helper that turns a `personId` into a display name.
 *
 * Used by the transactions table, transactions export, and asset detail
 * sheet so we don't re-implement the same `find(...)?.name || 'Unknown'`
 * snippet in three places.
 */
export function usePersonName(): (personId: string) => string {
  const { data: persons = [] } = usePersons();
  return useCallback(
    (personId: string) =>
      persons.find((p) => p.id === personId)?.name || 'Unknown',
    [persons]
  );
}
