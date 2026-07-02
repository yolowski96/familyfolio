import { prisma } from '../prisma';
import { rethrowDbError } from '@/lib/api/handle-error';
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
} satisfies Prisma.HoldingInclude;

/**
 * Either the root Prisma client or an interactive transaction client. Accept
 * both so that repository methods can participate in an outer `$transaction`
 * when atomicity across tables is required.
 */
type PrismaExec = typeof prisma | Prisma.TransactionClient;

export class HoldingRepository {
  async findAll(userId: string): Promise<HoldingWithRelations[]> {
    try {
      return await prisma.holding.findMany({
        where: { userId, quantity: { gt: 0 } },
        include: includeRelations,
        orderBy: { currentValue: 'desc' },
      });
    } catch (error) {
      rethrowDbError(error, 'HoldingRepository.findAll');
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
      rethrowDbError(error, 'HoldingRepository.findAllLean');
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
      rethrowDbError(error, 'HoldingRepository.findByPersonId');
    }
  }

  async findOne(
    userId: string,
    personId: string,
    assetSymbol: string
  ): Promise<HoldingWithRelations | null> {
    try {
      return await prisma.holding.findFirst({
        where: { userId, personId, assetSymbol },
        include: includeRelations,
      });
    } catch (error) {
      rethrowDbError(error, 'HoldingRepository.findOne');
    }
  }

  /**
   * Fast path: Update holding directly for a single BUY without full
   * recalculation. For SELL we still need the full cost-basis recalc because
   * the running average changes with every partial sell.
   *
   * Accepts an optional Prisma client (for participation in outer
   * transactions). The `ON CONFLICT` guard ensures we can never write across
   * users even if upstream validation is bypassed.
   */
  async updateHoldingForTransaction(
    userId: string,
    personId: string,
    tx: TransactionData,
    client: PrismaExec = prisma
  ): Promise<void> {
    try {
      if (tx.type === 'BUY') {
        const quantity = new Decimal(tx.quantity);
        const pricePerUnit = new Decimal(tx.pricePerUnit);
        const totalCost = quantity.times(pricePerUnit);

        await client.$executeRaw`
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
          WHERE holdings.user_id = EXCLUDED.user_id
        `;
      } else {
        await this.recalculateFromTransactions(userId, personId, client);
      }
    } catch (error) {
      rethrowDbError(error, 'HoldingRepository.updateHoldingForTransaction');
    }
  }

  /**
   * Replay the full transaction history for a single `personId` to rebuild
   * their holdings with correct running-average cost basis. Bulk-upserts all
   * rows in a single SQL statement and bulk-deletes obsolete rows in another,
   * independent of how many symbols are touched.
   */
  async recalculateFromTransactions(
    userId: string,
    personId: string,
    client: PrismaExec = prisma
  ): Promise<void> {
    try {
      const [transactions, existingHoldings] = await Promise.all([
        client.transaction.findMany({
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
        client.holding.findMany({
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

      // Build parallel arrays for bulk upsert via unnest
      const symbols: string[] = [];
      const names: string[] = [];
      const types: string[] = [];
      const quantities: number[] = [];
      const avgPrices: number[] = [];
      const invested: number[] = [];
      const currencies: string[] = [];

      const keepSymbols = new Set<string>();

      for (const [, h] of holdingsMap) {
        if (h.quantity.gt(0)) {
          const avgPrice = h.weightedPriceSum.div(h.quantity).toNumber();
          symbols.push(h.assetSymbol);
          names.push(h.assetName);
          types.push(h.assetType);
          quantities.push(h.quantity.toNumber());
          avgPrices.push(avgPrice);
          invested.push(h.totalInvested.toNumber());
          currencies.push(h.currency);
          keepSymbols.add(h.assetSymbol);
        }
      }

      const symbolsToDelete: string[] = [];
      for (const existing of existingHoldings) {
        if (!keepSymbols.has(existing.assetSymbol)) {
          symbolsToDelete.push(existing.assetSymbol);
        }
      }

      if (symbolsToDelete.length > 0) {
        await client.$executeRaw`
          DELETE FROM holdings
          WHERE user_id = ${userId}
            AND person_id = ${personId}
            AND asset_symbol = ANY(${symbolsToDelete}::text[])
        `;
      }

      if (symbols.length > 0) {
        await client.$executeRaw`
          INSERT INTO holdings (
            id, user_id, person_id, asset_symbol, asset_name, asset_type,
            quantity, average_price, total_invested, currency, created_at, updated_at
          )
          SELECT
            gen_random_uuid(),
            ${userId},
            ${personId},
            s.symbol,
            s.name,
            s.type::"AssetType",
            s.qty::numeric,
            s.avg_price::numeric,
            s.invested::numeric,
            s.currency,
            NOW(),
            NOW()
          FROM unnest(
            ${symbols}::text[],
            ${names}::text[],
            ${types}::text[],
            ${quantities}::double precision[],
            ${avgPrices}::double precision[],
            ${invested}::double precision[],
            ${currencies}::text[]
          ) AS s(symbol, name, type, qty, avg_price, invested, currency)
          ON CONFLICT (person_id, asset_symbol) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            average_price = EXCLUDED.average_price,
            total_invested = EXCLUDED.total_invested,
            currency = EXCLUDED.currency,
            asset_name = EXCLUDED.asset_name,
            asset_type = EXCLUDED.asset_type,
            updated_at = NOW()
          WHERE holdings.user_id = EXCLUDED.user_id
        `;
      }
    } catch (error) {
      rethrowDbError(error, 'HoldingRepository.recalculateFromTransactions');
    }
  }

  /**
   * Batch update of current prices for every holding owned by `userId` whose
   * `asset_symbol` matches an entry in the supplied map.
   */
  async updatePrices(userId: string, prices: Map<string, number>): Promise<number> {
    try {
      if (prices.size === 0) return 0;

      const symbols: string[] = [];
      const priceValues: number[] = [];
      for (const [symbol, price] of prices) {
        symbols.push(symbol);
        priceValues.push(price);
      }

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
      rethrowDbError(error, 'HoldingRepository.updatePrices');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { count } = await prisma.holding.deleteMany({ where: { id, userId } });
      if (count === 0) throw new Error('Holding not found');
    } catch (error) {
      rethrowDbError(error, 'HoldingRepository.delete');
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
      rethrowDbError(error, 'HoldingRepository.getUniqueAssets');
    }
  }
}

export const holdingRepository = new HoldingRepository();
