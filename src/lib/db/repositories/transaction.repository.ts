import { prisma } from '../prisma';
import { rethrowDbError } from '@/lib/api/handle-error';
import type { Transaction, Prisma, AssetType, TransactionType } from '@prisma/client';

export type CreateTransactionInput = {
  personId: string;
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  type: TransactionType;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  currency: string;
  fee?: number;
  date: Date | string;
  exchange?: string;
  notes?: string;
};

export type UpdateTransactionInput = Partial<Omit<CreateTransactionInput, 'personId'>>;

export type TransactionFilters = {
  personId?: string;
  assetSymbol?: string;
  assetType?: AssetType;
  type?: TransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  cursor?: string;
};

export type TransactionWithRelations = Transaction & {
  person: { id: string; name: string; color: string };
  asset: { symbol: string; name: string; type: AssetType };
};

const includeRelations = {
  person: { select: { id: true, name: true, color: true } },
  asset: { select: { symbol: true, name: true, type: true } },
} satisfies Prisma.TransactionInclude;

const DEFAULT_PAGE_SIZE = 500;
const MAX_PAGE_SIZE = 2000;

export class TransactionRepository {
  async findAll(userId: string, filters?: TransactionFilters): Promise<TransactionWithRelations[]> {
    try {
      const where: Prisma.TransactionWhereInput = { userId };

      if (filters?.personId) where.personId = filters.personId;
      if (filters?.assetSymbol) where.assetSymbol = filters.assetSymbol;
      if (filters?.assetType) where.assetType = filters.assetType;
      if (filters?.type) where.type = filters.type;

      if (filters?.dateFrom || filters?.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      const take = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

      return await prisma.transaction.findMany({
        where,
        include: includeRelations,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take,
        ...(filters?.cursor
          ? { cursor: { id: filters.cursor }, skip: 1 }
          : {}),
      });
    } catch (error) {
      rethrowDbError(error, 'TransactionRepository.findAll');
    }
  }

  async findAllLean(userId: string, filters?: TransactionFilters) {
    try {
      const where: Prisma.TransactionWhereInput = { userId };
      if (filters?.personId) where.personId = filters.personId;
      if (filters?.assetSymbol) where.assetSymbol = filters.assetSymbol;
      if (filters?.assetType) where.assetType = filters.assetType;
      if (filters?.type) where.type = filters.type;
      if (filters?.dateFrom || filters?.dateTo) {
        where.date = {};
        if (filters.dateFrom) where.date.gte = filters.dateFrom;
        if (filters.dateTo) where.date.lte = filters.dateTo;
      }

      const take = Math.min(filters?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

      return await prisma.transaction.findMany({
        where,
        select: {
          id: true,
          personId: true,
          assetSymbol: true,
          assetName: true,
          assetType: true,
          type: true,
          quantity: true,
          pricePerUnit: true,
          totalAmount: true,
          currency: true,
          fee: true,
          date: true,
          exchange: true,
          notes: true,
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take,
        ...(filters?.cursor
          ? { cursor: { id: filters.cursor }, skip: 1 }
          : {}),
      });
    } catch (error) {
      rethrowDbError(error, 'TransactionRepository.findAllLean');
    }
  }

  async findById(id: string, userId: string): Promise<TransactionWithRelations | null> {
    try {
      return await prisma.transaction.findFirst({
        where: { id, userId },
        include: includeRelations,
      });
    } catch (error) {
      rethrowDbError(error, 'TransactionRepository.findById');
    }
  }

  /**
   * Create a transaction. Wraps the asset upsert + transaction insert in a
   * single interactive transaction so either both succeed or neither does.
   *
   * Does NOT update the `Asset.name` on conflict — the assets table is shared
   * across users, so we preserve whatever name already exists. Names should
   * be refreshed from a trusted source (e.g. price providers), not from
   * user-submitted form data.
   */
  async create(userId: string, data: CreateTransactionInput): Promise<TransactionWithRelations> {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.asset.upsert({
          where: { symbol: data.assetSymbol },
          update: {},
          create: {
            symbol: data.assetSymbol,
            name: data.assetName,
            type: data.assetType,
            currency: data.currency,
            exchange: data.exchange,
          },
        });

        return await tx.transaction.create({
          data: {
            userId,
            personId: data.personId,
            assetSymbol: data.assetSymbol,
            assetName: data.assetName,
            assetType: data.assetType,
            type: data.type,
            quantity: data.quantity,
            pricePerUnit: data.pricePerUnit,
            totalAmount: data.totalAmount,
            currency: data.currency,
            fee: data.fee ?? 0,
            date: new Date(data.date),
            exchange: data.exchange,
            notes: data.notes,
          },
          include: includeRelations,
        });
      });
    } catch (error) {
      rethrowDbError(error, 'TransactionRepository.create');
    }
  }

  async update(
    id: string,
    userId: string,
    data: UpdateTransactionInput
  ): Promise<TransactionWithRelations> {
    try {
      return await prisma.$transaction(async (tx) => {
        if (data.assetSymbol && data.assetName && data.assetType) {
          await tx.asset.upsert({
            where: { symbol: data.assetSymbol },
            update: {},
            create: {
              symbol: data.assetSymbol,
              name: data.assetName,
              type: data.assetType,
              currency: data.currency || 'USD',
              exchange: data.exchange,
            },
          });
        }

        const updateData: Prisma.TransactionUncheckedUpdateInput = {};
        if (data.assetSymbol !== undefined) updateData.assetSymbol = data.assetSymbol;
        if (data.assetName !== undefined) updateData.assetName = data.assetName;
        if (data.assetType !== undefined) updateData.assetType = data.assetType;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.quantity !== undefined) updateData.quantity = data.quantity;
        if (data.pricePerUnit !== undefined) updateData.pricePerUnit = data.pricePerUnit;
        if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
        if (data.currency !== undefined) updateData.currency = data.currency;
        if (data.fee !== undefined) updateData.fee = data.fee;
        if (data.date !== undefined) updateData.date = new Date(data.date);
        if (data.exchange !== undefined) updateData.exchange = data.exchange;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const result = await tx.transaction.updateMany({
          where: { id, userId },
          data: updateData,
        });
        if (result.count === 0) {
          throw new Error('Transaction not found');
        }

        const updated = await tx.transaction.findFirst({
          where: { id, userId },
          include: includeRelations,
        });
        if (!updated) throw new Error('Transaction not found');
        return updated;
      });
    } catch (error) {
      rethrowDbError(error, 'TransactionRepository.update');
    }
  }

  /**
   * Delete a transaction and return its `personId` in a single round-trip so
   * callers can recalculate holdings without an extra SELECT.
   */
  async deleteAndReturnPersonId(id: string, userId: string): Promise<string | null> {
    try {
      const result = await prisma.$queryRaw<{ person_id: string }[]>`
        DELETE FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING person_id
      `;
      return result.length > 0 ? result[0].person_id : null;
    } catch (error) {
      rethrowDbError(error, 'TransactionRepository.deleteAndReturnPersonId');
    }
  }
}

export const transactionRepository = new TransactionRepository();
