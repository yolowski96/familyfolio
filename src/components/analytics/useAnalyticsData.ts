'use client';

import { useMemo } from 'react';
import {
  useFilteredTransactions,
  usePortfolioStore,
} from '@/store/usePortfolioStore';
import { usePortfolioWithPrices } from '@/hooks/usePortfolioWithPrices';
import { AssetHolding, AssetType } from '@/types';

export interface PerformanceData {
  winners: AssetHolding[];
  losers: AssetHolding[];
  totalWins: number;
  totalLosses: number;
  bestPerformer: AssetHolding | null;
  worstPerformer: AssetHolding | null;
  winRate: number;
}

export interface AllocationDatum {
  name: AssetType;
  value: number;
  percent: number;
}

export interface HoldingsPLDatum {
  name: string;
  pl: number;
  plPercent: number;
  type: AssetType;
}

export interface MonthlyVolumeDatum {
  month: string;
  buys: number;
  sells: number;
}

/**
 * Centralized derivations for the analytics tabs. Keeps each tab thin and
 * lets us reuse the same memoized values across them.
 */
export function useAnalyticsData() {
  const { summary } = usePortfolioWithPrices();
  const transactions = useFilteredTransactions();
  const persons = usePortfolioStore((state) => state.persons);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);

  const performanceData = useMemo<PerformanceData>(() => {
    const winners = summary.holdings.filter((h) => h.unrealizedPL > 0);
    const losers = summary.holdings.filter((h) => h.unrealizedPL < 0);

    const totalWins = winners.reduce((sum, h) => sum + h.unrealizedPL, 0);
    const totalLosses = Math.abs(
      losers.reduce((sum, h) => sum + h.unrealizedPL, 0)
    );

    const bestPerformer = summary.holdings.reduce<AssetHolding | null>(
      (best, h) =>
        !best || h.unrealizedPLPercent > best.unrealizedPLPercent ? h : best,
      null
    );
    const worstPerformer = summary.holdings.reduce<AssetHolding | null>(
      (worst, h) =>
        !worst || h.unrealizedPLPercent < worst.unrealizedPLPercent ? h : worst,
      null
    );

    return {
      winners,
      losers,
      totalWins,
      totalLosses,
      bestPerformer,
      worstPerformer,
      winRate:
        summary.holdings.length > 0
          ? (winners.length / summary.holdings.length) * 100
          : 0,
    };
  }, [summary.holdings]);

  const allocationData = useMemo<AllocationDatum[]>(
    () =>
      summary.allocationByType.map((item) => ({
        name: item.type,
        value: item.value,
        percent: item.percent,
      })),
    [summary.allocationByType]
  );

  const holdingsPLData = useMemo<HoldingsPLDatum[]>(
    () =>
      [...summary.holdings]
        .sort((a, b) => b.unrealizedPL - a.unrealizedPL)
        .slice(0, 8)
        .map((h) => ({
          name: h.symbol,
          pl: h.unrealizedPL,
          plPercent: h.unrealizedPLPercent,
          type: h.type,
        })),
    [summary.holdings]
  );

  const monthlyVolume = useMemo<MonthlyVolumeDatum[]>(() => {
    const volumeMap = new Map<string, { buys: number; sells: number }>();
    for (const tx of transactions) {
      const date = new Date(tx.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = volumeMap.get(key) ?? { buys: 0, sells: 0 };
      const value = Number(tx.quantity) * Number(tx.pricePerUnit);
      if (tx.type === 'BUY') existing.buys += value;
      else existing.sells += value;
      volumeMap.set(key, existing);
    }
    return Array.from(volumeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(`${month}-01`).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        buys: data.buys,
        sells: data.sells,
      }));
  }, [transactions]);

  const viewName =
    activePersonId === 'ALL'
      ? 'Family Portfolio'
      : persons.find((p) => p.id === activePersonId)?.name || 'Portfolio';

  return {
    summary,
    performanceData,
    allocationData,
    holdingsPLData,
    monthlyVolume,
    viewName,
  };
}
