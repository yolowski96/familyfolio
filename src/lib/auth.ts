import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export class AuthError extends Error {
  public status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError('Unauthorized');
  }

  return user;
}

/**
 * Faster variant of `getAuthUser` for read-only endpoints.
 *
 * Uses `supabase.auth.getSession()`, which reads and validates the JWT locally
 * from the cookie without a round-trip to the Supabase auth server. This skips
 * the ~200-500ms revocation check that `getUser()` performs.
 *
 * Use this for hot GET endpoints (e.g. dashboard read aggregation). Keep the
 * stricter `getAuthUser()` on mutation endpoints where server-side revocation
 * checks matter.
 */
export async function getAuthUserFast() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    throw new AuthError('Unauthorized');
  }

  return session.user;
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}
