'use client';

import {
  IconArrowUp,
  IconChartBar,
  IconChartPie,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SummaryStatCard } from '@/components/shared/SummaryStatCard';
import { formatCurrencyCompact } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import {
  AssetTypeIcon,
  TYPE_CHART_COLORS,
  TYPE_COLORS as TYPE_BG_COLORS,
} from '@/lib/assetTypeDisplay';
import { AssetType } from '@/types';
import type {
  AllocationDatum,
  MonthlyVolumeDatum,
  PerformanceData,
} from './useAnalyticsData';
import type { PortfolioSummary } from '@/types';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

interface AnalyticsOverviewTabProps {
  summary: PortfolioSummary;
  performanceData: PerformanceData;
  allocationData: AllocationDatum[];
  monthlyVolume: MonthlyVolumeDatum[];
}

export function AnalyticsOverviewTab({
  summary,
  performanceData,
  allocationData,
  monthlyVolume,
}: AnalyticsOverviewTabProps) {
  const totalPLPositive = summary.totalPL >= 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStatCard
          label="Total P/L"
          value={formatCurrencyCompact(summary.totalPL)}
          caption={formatPercent(summary.totalPLPercent)}
          icon={
            totalPLPositive ? (
              <IconTrendingUp className="size-6" />
            ) : (
              <IconTrendingDown className="size-6" />
            )
          }
          iconClassName={
            totalPLPositive
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-rose-500/10 text-rose-500'
          }
          valueClassName={
            totalPLPositive ? 'text-emerald-500' : 'text-rose-500'
          }
        />
        <SummaryStatCard
          label="Win Rate"
          value={`${performanceData.winRate.toFixed(0)}%`}
          caption={`${performanceData.winners.length} of ${summary.holdings.length} assets`}
          icon={<IconArrowUp className="size-6" />}
          iconClassName="bg-emerald-500/10 text-emerald-500"
        />
        <SummaryStatCard
          label="Total Gains"
          value={formatCurrencyCompact(performanceData.totalWins)}
          caption={`${performanceData.winners.length} winning positions`}
          icon={<IconTrendingUp className="size-6" />}
          iconClassName="bg-emerald-500/10 text-emerald-500"
          valueClassName="text-emerald-500"
        />
        <SummaryStatCard
          label="Total Losses"
          value={formatCurrencyCompact(performanceData.totalLosses)}
          caption={`${performanceData.losers.length} losing positions`}
          icon={<IconTrendingDown className="size-6" />}
          iconClassName="bg-rose-500/10 text-rose-500"
          valueClassName="text-rose-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconChartPie className="size-5" />
              Asset Allocation
            </CardTitle>
            <CardDescription>
              Portfolio distribution by asset type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={TYPE_CHART_COLORS[entry.name as AssetType]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrencyCompact(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {allocationData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{
                      backgroundColor: TYPE_CHART_COLORS[item.name as AssetType],
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.percent.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconChartBar className="size-5" />
              Monthly Activity
            </CardTitle>
            <CardDescription>Buy and sell volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyVolume}>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrencyCompact(value)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend />
                  <Bar
                    dataKey="buys"
                    name="Buys"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="sells"
                    name="Sells"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {performanceData.bestPerformer && (
          <PerformerCard
            tone="best"
            title="Best Performer"
            holding={performanceData.bestPerformer}
          />
        )}
        {performanceData.worstPerformer && (
          <PerformerCard
            tone="worst"
            title="Worst Performer"
            holding={performanceData.worstPerformer}
          />
        )}
      </div>
    </div>
  );
}

interface PerformerCardProps {
  tone: 'best' | 'worst';
  title: string;
  holding: NonNullable<PerformanceData['bestPerformer']>;
}

function PerformerCard({ tone, title, holding }: PerformerCardProps) {
  const isBest = tone === 'best';
  return (
    <Card
      className={
        isBest
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-rose-500/30 bg-rose-500/5'
      }
    >
      <CardHeader>
        <CardTitle
          className={
            isBest
              ? 'text-emerald-500 flex items-center gap-2'
              : 'text-rose-500 flex items-center gap-2'
          }
        >
          {isBest ? (
            <IconTrendingUp className="size-5" />
          ) : (
            <IconTrendingDown className="size-5" />
          )}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-12 items-center justify-center rounded-lg ${TYPE_BG_COLORS[holding.type]}`}
            >
              <AssetTypeIcon type={holding.type} size="lg" />
            </div>
            <div>
              <p className="font-semibold text-lg">{holding.symbol}</p>
              <p className="text-muted-foreground text-sm">{holding.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold ${isBest ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {formatPercent(holding.unrealizedPLPercent)}
            </p>
            <p className={isBest ? 'text-emerald-500/70' : 'text-rose-500/70'}>
              {formatCurrencyCompact(holding.unrealizedPL)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
