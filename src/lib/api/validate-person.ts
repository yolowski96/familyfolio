import { NextResponse } from 'next/server';
import { personRepository } from '@/lib/db/repositories';

/**
 * Validates that a personId belongs to the authenticated user.
 * Returns null if valid, or a 404 NextResponse if not found.
 */
export async function validatePersonOwnership(
  personId: string,
  userId: string
): Promise<NextResponse | null> {
  const person = await personRepository.findById(personId, userId);
  if (!person) {
    return NextResponse.json(
      { error: 'Person not found or does not belong to this user' },
      { status: 404 }
    );
  }
  return null;
}
