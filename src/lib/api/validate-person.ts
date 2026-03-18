import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Validates that a personId belongs to the authenticated user.
 * Uses a lightweight count query instead of fetching the full record.
 * Returns null if valid, or a 404 NextResponse if not found.
 */
export async function validatePersonOwnership(
  personId: string,
  userId: string
): Promise<NextResponse | null> {
  const count = await prisma.person.count({
    where: { id: personId, userId },
  });
  if (count === 0) {
    return NextResponse.json(
      { error: 'Person not found or does not belong to this user' },
      { status: 404 }
    );
  }
  return null;
}
