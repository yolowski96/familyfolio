import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Prisma error codes
export const PRISMA_ERROR_CODES = {
  UNIQUE_CONSTRAINT: 'P2002',
  FOREIGN_KEY_CONSTRAINT: 'P2003',
  RECORD_NOT_FOUND: 'P2025',
  REQUIRED_FIELD_MISSING: 'P2012',
  INVALID_DATA: 'P2019',
} as const;

/**
 * Handle Prisma errors and return user-friendly messages
 */
export function handlePrismaError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } };

    switch (prismaError.code) {
      case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT:
        const field = prismaError.meta?.target?.[0] || 'value';
        return `A record with this ${field} already exists`;

      case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT:
        return 'Related record not found';

      case PRISMA_ERROR_CODES.RECORD_NOT_FOUND:
        return 'Record not found';

      case PRISMA_ERROR_CODES.REQUIRED_FIELD_MISSING:
        return 'Required field is missing';

      case PRISMA_ERROR_CODES.INVALID_DATA:
        return 'Invalid data provided';

      default:
        console.error('Unhandled Prisma error:', error);
        return 'Database operation failed';
    }
  }

  console.error('Unknown database error:', error);
  return 'Database operation failed';
}

/**
 * Check if error is a Prisma "not found" error
 */
export function isNotFoundError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === PRISMA_ERROR_CODES.RECORD_NOT_FOUND
  );
}

/**
 * Check if error is a Prisma unique constraint error
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT
  );
}

export default prisma;
