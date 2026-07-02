import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { AuthError } from '@/lib/auth';
import { personRepository } from '@/lib/db/repositories';

/**
 * Keys are issued by an external application and pasted into the person edit
 * dialog, so the format is not ours to dictate — only sanity-checked.
 * Returns an error message, or null when the key is acceptable.
 */
export function validateApiKeyFormat(apiKey: string): string | null {
  if (apiKey.length < 16) {
    return 'API key must be at least 16 characters';
  }
  if (apiKey.length > 256) {
    return 'API key must be at most 256 characters';
  }
  // Printable ASCII without spaces — covers every common key format
  // (hex, base64, base64url, UUID, prefixed tokens).
  if (!/^[\x21-\x7e]+$/.test(apiKey)) {
    return 'API key must not contain spaces or non-ASCII characters';
  }
  return null;
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Authenticate an external request via `Authorization: Bearer <api key>`.
 * The key identifies a single person; returns that person (with owning
 * userId) or throws `AuthError` (mapped to 401 by `handleApiError`).
 */
export async function getApiKeyPerson(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AuthError('Missing or malformed Authorization header');
  }

  const person = await personRepository.findByApiKeyHash(hashApiKey(match[1].trim()));
  if (!person) {
    throw new AuthError('Invalid API key');
  }

  return person;
}
