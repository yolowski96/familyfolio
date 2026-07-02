'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { queryKeys } from './keys';
import { useBootstrapSubscribe } from './bootstrap';
import type { DbPerson, DbTransaction, DbHolding } from '@/types/db';

async function fetchPersons(): Promise<DbPerson[]> {
  const response = await fetch('/api/persons');
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load persons');
  }
  return response.json();
}

export function usePersons(): UseQueryResult<DbPerson[]> {
  const bootstrap = useBootstrapSubscribe();
  // Gated on bootstrap completion so we don't race a duplicate /api/persons
  // fetch on cold start. Bootstrap's queryFn seeds this key in the cache, so
  // once enabled flips true the data is already fresh and queryFn is skipped
  // — it only fires on a future explicit invalidate.
  return useQuery({
    queryKey: queryKeys.persons.list(),
    queryFn: fetchPersons,
    staleTime: 5 * 60 * 1000,
    enabled: bootstrap.isSuccess,
  });
}

type CreatePersonInput = { name: string; color: string; isDefault?: boolean };

export function useAddPerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePersonInput): Promise<DbPerson> => {
      const response = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create person');
      }
      return response.json();
    },
    onSuccess: (newPerson) => {
      queryClient.setQueryData<DbPerson[]>(
        queryKeys.persons.list(),
        (prev = []) => [...prev, newPerson]
      );
    },
  });
}

type UpdatePersonInput = {
  id: string;
  // apiKey: string sets a new external key, null removes it
  updates: { name?: string; color?: string; isDefault?: boolean; apiKey?: string | null };
};

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: UpdatePersonInput): Promise<DbPerson> => {
      const response = await fetch(`/api/persons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update person');
      }
      return response.json();
    },
    onSuccess: (updatedPerson, { updates }) => {
      // `isDefault=true` demotes the previous default on the server, so a list
      // invalidate is the simplest way to keep the UI in sync.
      if (updates.isDefault) {
        queryClient.invalidateQueries({ queryKey: queryKeys.persons.all });
        return;
      }
      queryClient.setQueryData<DbPerson[]>(
        queryKeys.persons.list(),
        (prev = []) => prev.map((p) => (p.id === updatedPerson.id ? updatedPerson : p))
      );
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/persons/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete person');
      }
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<DbPerson[]>(
        queryKeys.persons.list(),
        (prev = []) => prev.filter((p) => p.id !== deletedId)
      );
      // Transactions and holdings are FK-cascaded on the server; purge them
      // from the local cache instead of refetching.
      queryClient.setQueryData<DbTransaction[]>(
        queryKeys.transactions.list(),
        (prev = []) => prev.filter((t) => t.personId !== deletedId)
      );
      queryClient.setQueryData<DbHolding[]>(
        queryKeys.holdings.list(),
        (prev = []) => prev.filter((h) => h.personId !== deletedId)
      );
    },
  });
}

/**
 * Convenience wrapper: set a person as default (also demotes others).
 */
export function useSetDefaultPerson() {
  const updatePerson = useUpdatePerson();
  return {
    ...updatePerson,
    mutateAsync: (id: string) => updatePerson.mutateAsync({ id, updates: { isDefault: true } }),
  };
}
