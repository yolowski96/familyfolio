import { prisma, handlePrismaError } from '../prisma';
import type { Holding, AssetType } from '@prisma/client';
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

  async recalculateFromTransactions(userId: string, personId: string): Promise<void> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId, personId },
        orderBy: { date: 'asc' },
      });

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
        const fee = new Decimal(tx.fee.toString());
        const total = new Decimal(tx.totalAmount.toString()).plus(fee);

        if (tx.type === 'BUY') {
          holding.quantity = holding.quantity.plus(quantity);
          holding.totalInvested = holding.totalInvested.plus(total);
          holding.weightedPriceSum = holding.weightedPriceSum.plus(quantity.times(pricePerUnit));
        } else if (tx.type === 'SELL') {
          if (holding.quantity.gt(0)) {
            const avgPrice = holding.weightedPriceSum.div(holding.quantity);
            holding.quantity = holding.quantity.minus(quantity);
            const soldValue = quantity.times(avgPrice);
            holding.totalInvested = holding.totalInvested.minus(soldValue);
            holding.weightedPriceSum = holding.weightedPriceSum.minus(quantity.times(avgPrice));
          }
        }
      }

      for (const [, holdingData] of holdingsMap) {
        if (holdingData.quantity.lte(0)) {
          await prisma.holding.deleteMany({
            where: { userId, personId, assetSymbol: holdingData.assetSymbol },
          });
        } else {
          const avgPrice = holdingData.weightedPriceSum.div(holdingData.quantity);
          await this.upsert(
            userId, personId, holdingData.assetSymbol, holdingData.assetName, holdingData.assetType,
            {
              quantity: holdingData.quantity.toNumber(),
              averagePrice: avgPrice.toNumber(),
              totalInvested: holdingData.totalInvested.toNumber(),
              currency: holdingData.currency,
            }
          );
        }
      }

      const existingHoldings = await prisma.holding.findMany({
        where: { userId, personId },
        select: { assetSymbol: true },
      });

      for (const holding of existingHoldings) {
        if (!holdingsMap.has(holding.assetSymbol)) {
          await prisma.holding.deleteMany({
            where: { userId, personId, assetSymbol: holding.assetSymbol },
          });
        }
      }
    } catch (error) {
      console.error('Error recalculating holdings:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async updatePrices(userId: string, prices: Map<string, number>): Promise<number> {
    try {
      const holdings = await this.findAll(userId);
      let updatedCount = 0;

      for (const holding of holdings) {
        const currentPrice = prices.get(holding.assetSymbol);
        if (currentPrice !== undefined) {
          const quantity = new Decimal(holding.quantity.toString());
          const totalInvested = new Decimal(holding.totalInvested.toString());
          const currentValue = quantity.times(currentPrice);
          const profitLoss = currentValue.minus(totalInvested);
          const profitLossPercent = totalInvested.gt(0)
            ? profitLoss.div(totalInvested).times(100)
            : new Decimal(0);

          await prisma.holding.update({
            where: { id: holding.id },
            data: {
              currentPrice,
              currentValue: currentValue.toNumber(),
              profitLoss: profitLoss.toNumber(),
              profitLossPercent: profitLossPercent.toNumber(),
              lastPriceUpdate: new Date(),
            },
          });
          updatedCount++;
        }
      }

      return updatedCount;
    } catch (error) {
      console.error('Error updating prices:', error);
      throw new Error(handlePrismaError(error));
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const existing = await prisma.holding.findFirst({ where: { id, userId } });
      if (!existing) throw new Error('Holding not found');

      await prisma.holding.delete({ where: { id } });
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
