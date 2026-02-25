import { prisma, handlePrismaError } from '../prisma';
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
};

export type TransactionWithRelations = Transaction & {
  person: {
    id: string;
    name: string;
    color: string;
  };
  asset: {
    symbol: string;
    name: string;
    type: AssetType;
  };
};

const includeRelations = {
  person: { select: { id: true, name: true, color: true } },
  asset: { select: { symbol: true, name: true, type: true } },
};

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

      return await prisma.transaction.findMany({
        where,
        include: includeRelations,
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findById(id: string, userId: string): Promise<TransactionWithRelations | null> {
    try {
      return await prisma.transaction.findFirst({
        where: { id, userId },
        include: includeRelations,
      });
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async create(userId: string, data: CreateTransactionInput): Promise<TransactionWithRelations> {
    try {
      await this.ensureAssetExists(
        data.assetSymbol, data.assetName, data.assetType, data.currency, data.exchange
      );

      return await prisma.transaction.create({
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
          fee: data.fee || 0,
          date: new Date(data.date),
          exchange: data.exchange,
          notes: data.notes,
        },
        include: includeRelations,
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async update(id: string, userId: string, data: UpdateTransactionInput): Promise<TransactionWithRelations> {
    try {
      const existing = await prisma.transaction.findFirst({ where: { id, userId } });
      if (!existing) throw new Error('Transaction not found');

      if (data.assetSymbol && data.assetName && data.assetType) {
        await this.ensureAssetExists(
          data.assetSymbol, data.assetName, data.assetType, data.currency || 'USD', data.exchange
        );
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

      return await prisma.transaction.update({
        where: { id },
        data: updateData,
        include: includeRelations,
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const existing = await prisma.transaction.findFirst({ where: { id, userId } });
      if (!existing) throw new Error('Transaction not found');

      await prisma.transaction.delete({ where: { id } });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findByPersonId(userId: string, personId: string): Promise<TransactionWithRelations[]> {
    return this.findAll(userId, { personId });
  }

  async findByAssetSymbol(userId: string, assetSymbol: string): Promise<TransactionWithRelations[]> {
    return this.findAll(userId, { assetSymbol });
  }

  async countByPersonId(userId: string, personId: string): Promise<number> {
    try {
      return await prisma.transaction.count({
        where: { userId, personId },
      });
    } catch (error) {
      console.error('Error counting transactions:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findRecent(userId: string, limit: number = 10): Promise<TransactionWithRelations[]> {
    try {
      return await prisma.transaction.findMany({
        where: { userId },
        include: includeRelations,
        orderBy: { date: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  private async ensureAssetExists(
    symbol: string, name: string, type: AssetType, currency: string, exchange?: string
  ): Promise<void> {
    const exists = await prisma.asset.findUnique({ where: { symbol } });

    if (!exists) {
      await prisma.asset.create({ data: { symbol, name, type, currency, exchange } });
    } else if (exists.name !== name || exists.exchange !== exchange) {
      await prisma.asset.update({ where: { symbol }, data: { name, exchange } });
    }
  }
}

export const transactionRepository = new TransactionRepository();
