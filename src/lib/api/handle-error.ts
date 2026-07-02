import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { AuthError, unauthorizedResponse } from '@/lib/auth';

/**
 * Centralised API error → `NextResponse` mapper.
 *
 * Prefer letting Prisma errors bubble out of repositories so this helper can
 * map them to the correct HTTP status code. Wrapping errors in a generic
 * `new Error(string)` loses that typing and forces 500s for everything.
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  if (error instanceof AuthError) {
    return unauthorizedResponse(error.message);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      case 'P2002': {
        const target = (error.meta?.target as string[] | undefined)?.join(', ') || 'value';
        return NextResponse.json(
          { error: `A record with this ${target} already exists` },
          { status: 409 }
        );
      }
      case 'P2003':
        return NextResponse.json(
          { error: 'Related record not found' },
          { status: 400 }
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { error: 'Invalid data provided' },
      { status: 400 }
    );
  }

  console.error(context ? `[${context}]` : '[API error]', error);

  const message =
    error instanceof Error && process.env.NODE_ENV !== 'production'
      ? error.message
      : 'Internal server error';

  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Thin helper for repos that want to keep the `throw new Error(string)` API
 * but without swallowing Prisma's original error in the common case. Logs
 * with context, re-throws Prisma typed errors, wraps everything else in a
 * generic `Error`.
 */
export function rethrowDbError(error: unknown, context: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof AuthError
  ) {
    throw error;
  }
  console.error(`[${context}]`, error);
  throw error instanceof Error ? error : new Error('Database operation failed');
}
