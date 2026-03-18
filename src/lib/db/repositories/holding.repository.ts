import { prisma, handlePrismaError } from '../prisma';
import type { Holding, AssetType, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

export type UpdateHoldingInput = {
  quantity: number;
  averagePrice: number;
  totalInvested: number;
  currentPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  currency: string;
};

export type HoldingWithRelations = Holding & {
  person: { id: string; name: string; color: string };
  asset: { symbol: string; name: string; type: AssetType };
};

export type HoldingWithAsset = Holding & {
  asset: { symbol: string; name: string; type: AssetType };
};

type HoldingCalculation = {
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  quantity: Decimal;
  totalInvested: Decimal;
  weightedPriceSum: Decimal;
  currency: string;
};

export type TransactionData = {
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  type: 'BUY' | 'SELL';
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  fee: number;
  currency: string;
};

const includeRelations = {
  person: { select: { id: true, name: true, color: true } },
  asset: { select: { symbol: true, name: true, type: true } },
};

export class HoldingRepository {
  async findAll(userId: string): Promise<HoldingWithRelations[]> {
    try {
      return await prisma.holding.findMany({
        where: { userId, quantity: { gt: 0 } },
        include: includeRelations,
        orderBy: { currentValue: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching holdings:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findAllLean(userId: string) {
    try {
      return await prisma.holding.findMany({
        where: { userId, quantity: { gt: 0 } },
        select: {
          id: true,
          personId: true,
          assetSymbol: true,
          assetName: true,
          assetType: true,
          quantity: true,
          averagePrice: true,
          totalInvested: true,
          currentPrice: true,
          currentValue: true,
          currency: true,
        },
        orderBy: { currentValue: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching holdings:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findByPersonId(userId: string, personId: string): Promise<HoldingWithAsset[]> {
    try {
      return await prisma.holding.findMany({
        where: { userId, personId, quantity: { gt: 0 } },
        include: { asset: { select: { symbol: true, name: true, type: true } } },
        orderBy: { currentValue: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching holdings by person:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async findOne(userId: string, personId: string, assetSymbol: string): Promise<HoldingWithRelations | null> {
    try {
      return await prisma.holding.findFirst({
        where: { userId, personId, assetSymbol },
        include: includeRelations,
      });
    } catch (error) {
      console.error('Error fetching holding:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async upsert(
    userId: string,
    personId: string,
    assetSymbol: string,
    assetName: string,
    assetType: AssetType,
    data: UpdateHoldingInput
  ): Promise<Holding> {
    try {
      return await prisma.holding.upsert({
        where: { unique_person_asset: { personId, assetSymbol } },
        update: {
          ...data,
          lastPriceUpdate: data.currentPrice !== undefined ? new Date() : undefined,
        },
        create: {
          userId,
          personId,
          assetSymbol,
          assetName,
          assetType,
          ...data,
          lastPriceUpdate: data.currentPrice !== undefined ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error('Error upserting holding:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  /**
   * Fast path: Update holding directly for a single transaction without full recalculation.
   * Uses a single raw SQL upsert for BUY transactions (atomic and fast).
   */
  async updateHoldingForTransaction(
    userId: string,
    personId: string,
    tx: TransactionData
  ): Promise<void> {
    try {
      if (tx.type === 'BUY') {
        const quantity = new Decimal(tx.quantity);
        const pricePerUnit = new Decimal(tx.pricePerUnit);
        const totalCost = quantity.times(pricePerUnit);

        await prisma.$executeRaw`
          INSERT INTO holdings (
            id, user_id, person_id, asset_symbol, asset_name, asset_type,
            quantity, average_price, total_invested, currency, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            ${userId},
            ${personId},
            ${tx.assetSymbol},
            ${tx.assetName},
            ${tx.assetType}::"AssetType",
            ${quantity.toNumber()},
            ${pricePerUnit.toNumber()},
            ${totalCost.toNumber()},
            ${tx.currency},
            NOW(),
            NOW()
          )
          ON CONFLICT (person_id, asset_symbol) DO UPDATE SET
            quantity = holdings.quantity + EXCLUDED.quantity,
            total_invested = holdings.total_invested + EXCLUDED.total_invested,
            average_price = (
              (holdings.quantity * holdings.average_price) + (EXCLUDED.quantity * EXCLUDED.average_price)
            ) / (holdings.quantity + EXCLUDED.quantity),
            updated_at = NOW()
        `;
      } else {
        // SELL - need full recalculation for correct cost basis
        await this.recalculateFromTransactions(userId, personId);
      }
    } catch (error) {
      console.error('Error updating holding for transaction:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async recalculateFromTransactions(userId: string, personId: string): Promise<void> {
    try {
      const [transactions, existingHoldings] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId, personId },
          select: {
            assetSymbol: true,
            assetName: true,
            assetType: true,
            type: true,
            quantity: true,
            pricePerUnit: true,
            currency: true,
          },
          orderBy: { date: 'asc' },
        }),
        prisma.holding.findMany({
          where: { userId, personId },
          select: { assetSymbol: true },
        }),
      ]);

      const holdingsMap = new Map<string, HoldingCalculation>();

      for (const tx of transactions) {
        const key = tx.assetSymbol;

        if (!holdingsMap.has(key)) {
          holdingsMap.set(key, {
            assetSymbol: tx.assetSymbol,
            assetName: tx.assetName,
            assetType: tx.assetType,
            quantity: new Decimal(0),
            totalInvested: new Decimal(0),
            weightedPriceSum: new Decimal(0),
            currency: tx.currency,
          });
        }

        const holding = holdingsMap.get(key)!;
        const quantity = new Decimal(tx.quantity.toString());
        const pricePerUnit = new Decimal(tx.pricePerUnit.toString());
        const cost = quantity.times(pricePerUnit);

        if (tx.type === 'BUY') {
          holding.quantity = holding.quantity.plus(quantity);
          holding.totalInvested = holding.totalInvested.plus(cost);
          holding.weightedPriceSum = holding.weightedPriceSum.plus(cost);
        } else if (tx.type === 'SELL') {
          if (holding.quantity.gt(0)) {
            const avgPrice = holding.weightedPriceSum.div(holding.quantity);
            holding.quantity = holding.quantity.minus(quantity);
            const soldValue = quantity.times(avgPrice);
            holding.totalInvested = holding.totalInvested.minus(soldValue);
            holding.weightedPriceSum = holding.weightedPriceSum.minus(soldValue);
          }
        }
      }

      // Build batch operations for a single atomic transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const operations: Prisma.PrismaPromise<any>[] = [];

      // Find symbols to delete (zero quantity or orphaned)
      const symbolsToDelete: string[] = [];
      for (const [symbol, holdingData] of holdingsMap) {
        if (holdingData.quantity.lte(0)) {
          symbolsToDelete.push(symbol);
        }
      }
      for (const existing of existingHoldings) {
        if (!holdingsMap.has(existing.assetSymbol)) {
          symbolsToDelete.push(existing.assetSymbol);
        }
      }

      if (symbolsToDelete.length > 0) {
        operations.push(
          prisma.holding.deleteMany({
            where: { userId, personId, assetSymbol: { in: symbolsToDelete } },
          })
        );
      }

      // Build upserts for holdings with positive quantity
      for (const [, holdingData] of holdingsMap) {
        if (holdingData.quantity.gt(0)) {
          const avgPrice = holdingData.weightedPriceSum.div(holdingData.quantity);
          operations.push(
            prisma.holding.upsert({
              where: { unique_person_asset: { personId, assetSymbol: holdingData.assetSymbol } },
              update: {
                quantity: holdingData.quantity.toNumber(),
                averagePrice: avgPrice.toNumber(),
                totalInvested: holdingData.totalInvested.toNumber(),
                currency: holdingData.currency,
              },
              create: {
                userId,
                personId,
                assetSymbol: holdingData.assetSymbol,
                assetName: holdingData.assetName,
                assetType: holdingData.assetType,
                quantity: holdingData.quantity.toNumber(),
                averagePrice: avgPrice.toNumber(),
                totalInvested: holdingData.totalInvested.toNumber(),
                currency: holdingData.currency,
              },
            })
          );
        }
      }

      // Execute all deletes and upserts in a single atomic transaction
      if (operations.length > 0) {
        await prisma.$transaction(operations);
      }
    } catch (error) {
      console.error('Error recalculating holdings:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async recalculateAll(userId: string): Promise<void> {
    try {
      const persons = await prisma.person.findMany({
        where: { userId },
        select: { id: true },
      });

      await Promise.all(
        persons.map((person) => this.recalculateFromTransactions(userId, person.id))
      );
    } catch (error) {
      console.error('Error recalculating all holdings:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async updatePrices(userId: string, prices: Map<string, number>): Promise<number> {
    try {
      if (prices.size === 0) return 0;

      const symbols: string[] = [];
      const priceValues: number[] = [];
      for (const [symbol, price] of prices) {
        symbols.push(symbol);
        priceValues.push(price);
      }

      // Single query: UPDATE all holdings with computed current_value, profit_loss, profit_loss_percent
      const updatedCount = await prisma.$executeRaw`
        UPDATE holdings AS h SET
          current_price = v.price,
          current_value = h.quantity * v.price,
          profit_loss = (h.quantity * v.price) - h.total_invested,
          profit_loss_percent = CASE
            WHEN h.total_invested > 0
            THEN (((h.quantity * v.price) - h.total_invested) / h.total_invested) * 100
            ELSE 0
          END,
          last_price_update = NOW(),
          updated_at = NOW()
        FROM (
          SELECT unnest(${symbols}::text[]) AS symbol,
                 unnest(${priceValues}::double precision[]) AS price
        ) AS v
        WHERE h.user_id = ${userId}
          AND h.asset_symbol = v.symbol
          AND h.quantity > 0
      `;

      return updatedCount;
    } catch (error) {
      console.error('Error updating prices:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { count } = await prisma.holding.deleteMany({ where: { id, userId } });
      if (count === 0) throw new Error('Holding not found');
    } catch (error) {
      console.error('Error deleting holding:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async getTotalValue(userId: string): Promise<number> {
    try {
      const result = await prisma.holding.aggregate({
        where: { userId, quantity: { gt: 0 }, currentValue: { not: null } },
        _sum: { currentValue: true },
      });
      return result._sum.currentValue?.toNumber() || 0;
    } catch (error) {
      console.error('Error getting total value:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async getByAssetType(userId: string): Promise<Map<AssetType, HoldingWithRelations[]>> {
    try {
      const holdings = await this.findAll(userId);
      const grouped = new Map<AssetType, HoldingWithRelations[]>();
      for (const holding of holdings) {
        if (!grouped.has(holding.assetType)) grouped.set(holding.assetType, []);
        grouped.get(holding.assetType)!.push(holding);
      }
      return grouped;
    } catch (error) {
      console.error('Error getting holdings by type:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async getUniqueAssets(userId: string): Promise<Array<{ symbol: string; type: AssetType }>> {
    try {
      const holdings = await prisma.holding.findMany({
        where: { userId, quantity: { gt: 0 } },
        select: { assetSymbol: true, assetType: true },
        distinct: ['assetSymbol'],
      });
      return holdings.map((h) => ({ symbol: h.assetSymbol, type: h.assetType }));
    } catch (error) {
      console.error('Error getting unique assets:', error);
      throw new Error(handlePrismaError(error));
    }
  }
}

export const holdingRepository = new HoldingRepository();
