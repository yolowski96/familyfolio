'use client';

import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
} from '@tabler/icons-react';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
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
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <IconArrowDown className="size-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Total Bought</p>
            <p className="text-xl font-semibold text-emerald-500">{formatCurrency(stats.totalBuys)}</p>
            <p className="text-muted-foreground text-xs">{stats.buyCount} transactions</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className="flex size-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
            <IconArrowUp className="size-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Total Sold</p>
            <p className="text-xl font-semibold text-rose-500">{formatCurrency(stats.totalSells)}</p>
            <p className="text-muted-foreground text-xs">{stats.sellCount} transactions</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className={`flex size-12 items-center justify-center rounded-lg ${stats.netFlow >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {stats.netFlow >= 0 ? <IconArrowDown className="size-6" /> : <IconArrowUp className="size-6" />}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Net Investment</p>
            <p className={`text-xl font-semibold ${stats.netFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(Math.abs(stats.netFlow))}
            </p>
            <p className="text-muted-foreground text-xs">{stats.netFlow >= 0 ? 'Net inflow' : 'Net outflow'}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className="flex size-12 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <IconCalendar className="size-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Total Transactions</p>
            <p className="text-xl font-semibold">{totalCount}</p>
            <p className="text-muted-foreground text-xs">{DATE_RANGE_LABELS[dateRange]}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
