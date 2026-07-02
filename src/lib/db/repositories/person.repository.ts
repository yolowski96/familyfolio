import { prisma } from '../prisma';
import { rethrowDbError } from '@/lib/api/handle-error';
import type { Person, Prisma } from '@prisma/client';

export type CreatePersonInput = {
  name: string;
  color: string;
  isDefault?: boolean;
};

export type UpdatePersonInput = Partial<CreatePersonInput> & {
  // Set together (paste new external key) or both null (remove key).
  apiKeyHash?: string | null;
  apiKeyPrefix?: string | null;
};

/**
 * Person shape returned to clients: everything except `apiKeyHash`. The hash
 * never leaves the server — external keys may be low-entropy, so exposing
 * even the hash would invite offline brute-forcing.
 */
export type SafePerson = Omit<Person, 'apiKeyHash'>;

const safePersonSelect = {
  id: true,
  userId: true,
  name: true,
  color: true,
  isDefault: true,
  apiKeyPrefix: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PersonSelect;

export type PersonWithHoldings = Person & {
  holdings: Array<{
    id: string;
    assetSymbol: string;
    assetName: string;
    assetType: string;
    quantity: Prisma.Decimal;
    averagePrice: Prisma.Decimal;
    totalInvested: Prisma.Decimal;
    currentPrice: Prisma.Decimal | null;
    currentValue: Prisma.Decimal | null;
    profitLoss: Prisma.Decimal | null;
    profitLossPercent: Prisma.Decimal | null;
    currency: string;
    asset: {
      symbol: string;
      name: string;
      type: string;
    };
  }>;
};

export class PersonRepository {
  async findAll(userId: string): Promise<SafePerson[]> {
    try {
      return await prisma.person.findMany({
        where: { userId },
        select: safePersonSelect,
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      rethrowDbError(error, 'PersonRepository.findAll');
    }
  }

  async findById(id: string, userId: string): Promise<SafePerson | null> {
    try {
      return await prisma.person.findFirst({
        where: { id, userId },
        select: safePersonSelect,
      });
    } catch (error) {
      rethrowDbError(error, 'PersonRepository.findById');
    }
  }

  /**
   * Server-side only (external API auth) — resolves a hashed bearer key to
   * the person it grants access to. Never expose the result directly.
   */
  async findByApiKeyHash(apiKeyHash: string): Promise<Person | null> {
    try {
      return await prisma.person.findUnique({ where: { apiKeyHash } });
    } catch (error) {
      rethrowDbError(error, 'PersonRepository.findByApiKeyHash');
    }
  }

  async create(userId: string, data: CreatePersonInput): Promise<SafePerson> {
    try {
      if (data.isDefault) {
        const [, person] = await prisma.$transaction([
          prisma.person.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          }),
          prisma.person.create({
            data: { ...data, userId },
            select: safePersonSelect,
          }),
        ]);
        return person;
      }

      return await prisma.person.create({
        data: { ...data, userId },
        select: safePersonSelect,
      });
    } catch (error) {
      rethrowDbError(error, 'PersonRepository.create');
    }
  }

  /**
   * Update a person using a single `UPDATE ... RETURNING` + optional
   * demote-others-to-non-default in one interactive transaction. Returns null
   * when the row does not belong to `userId` so callers can map to 404.
   */
  async update(
    id: string,
    userId: string,
    data: UpdatePersonInput
  ): Promise<SafePerson | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        if (data.isDefault) {
          await tx.person.updateMany({
            where: { userId, isDefault: true, id: { not: id } },
            data: { isDefault: false },
          });
        }

        const result = await tx.person.updateMany({
          where: { id, userId },
          data,
        });
        if (result.count === 0) return null;

        return tx.person.findUnique({ where: { id }, select: safePersonSelect });
      });
    } catch (error) {
      rethrowDbError(error, 'PersonRepository.update');
    }
  }

  async delete(id: string, userId: string): Promise<boolean> {
    try {
      const { count } = await prisma.person.deleteMany({ where: { id, userId } });
      return count > 0;
    } catch (error) {
      rethrowDbError(error, 'PersonRepository.delete');
    }
  }
}

export const personRepository = new PersonRepository();
