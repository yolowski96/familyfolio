'use client';

import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
} from '@tabler/icons-react';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { formatCurrency } from '@/lib/utils';
import { SummaryStatCard } from '@/components/shared/SummaryStatCard';
import { TransactionStats, DateRange } from './hooks/useTransactionsFilter';

interface TransactionsSummaryStatsProps {
  stats: TransactionStats;
  totalCount: number;
  dateRange: DateRange;
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: 'All time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '1y': 'Last year',
};

export function TransactionsSummaryStats({
  stats,
  totalCount,
  dateRange,
}: TransactionsSummaryStatsProps) {
  usePrivacy();
  const netInflow = stats.netFlow >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryStatCard
        label="Total Bought"
        value={formatCurrency(stats.totalBuys)}
        caption={`${stats.buyCount} transactions`}
        icon={<IconArrowDown className="size-6" />}
        iconClassName="bg-emerald-500/10 text-emerald-500"
        valueClassName="text-emerald-500"
      />
      <SummaryStatCard
        label="Total Sold"
        value={formatCurrency(stats.totalSells)}
        caption={`${stats.sellCount} transactions`}
        icon={<IconArrowUp className="size-6" />}
        iconClassName="bg-rose-500/10 text-rose-500"
        valueClassName="text-rose-500"
      />
      <SummaryStatCard
        label="Net Investment"
        value={formatCurrency(Math.abs(stats.netFlow))}
        caption={netInflow ? 'Net inflow' : 'Net outflow'}
        icon={
          netInflow ? (
            <IconArrowDown className="size-6" />
          ) : (
            <IconArrowUp className="size-6" />
          )
        }
        iconClassName={
          netInflow
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-rose-500/10 text-rose-500'
        }
        valueClassName={netInflow ? 'text-emerald-500' : 'text-rose-500'}
      />
      <SummaryStatCard
        label="Total Transactions"
        value={totalCount}
        caption={DATE_RANGE_LABELS[dateRange]}
        icon={<IconCalendar className="size-6" />}
        iconClassName="bg-violet-500/10 text-violet-500"
      />
    </div>
  );
}
