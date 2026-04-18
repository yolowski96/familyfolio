'use client';

import {
  Bar,
  BarChart,
  Cell,
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
import { formatCurrencyCompact } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import {
  AssetTypeIcon,
  TYPE_COLORS as TYPE_BG_COLORS,
} from '@/lib/assetTypeDisplay';
import type { HoldingsPLDatum } from './useAnalyticsData';
import type { PortfolioSummary } from '@/types';

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

interface AnalyticsPerformanceTabProps {
  summary: PortfolioSummary;
  holdingsPLData: HoldingsPLDatum[];
}

export function AnalyticsPerformanceTab({
  summary,
  holdingsPLData,
}: AnalyticsPerformanceTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profit/Loss by Asset</CardTitle>
          <CardDescription>
            Unrealized gains and losses across your holdings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={holdingsPLData} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => formatCurrencyCompact(value)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrencyCompact(value),
                    'P/L',
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="pl" radius={[0, 4, 4, 0]}>
                  {holdingsPLData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.pl >= 0 ? '#10b981' : '#f43f5e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holdings Performance</CardTitle>
          <CardDescription>
            Detailed performance metrics for each asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.holdings.map((holding) => {
              const plPositive = holding.unrealizedPL >= 0;
              const change24Positive = holding.change24hPercent >= 0;
              return (
                <div
                  key={holding.symbol}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${TYPE_BG_COLORS[holding.type]}`}
                    >
                      <AssetTypeIcon type={holding.type} />
                    </div>
                    <div>
                      <p className="font-medium">{holding.symbol}</p>
                      <p className="text-muted-foreground text-sm">
                        {holding.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">Value</p>
                      <p className="font-medium">
                        {formatCurrencyCompact(holding.totalValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">24h</p>
                      <p
                        className={`font-medium ${change24Positive ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {formatPercent(holding.change24hPercent)}
                      </p>
                    </div>
                    <div className="text-right min-w-24">
                      <p className="text-muted-foreground text-xs">P/L</p>
                      <p
                        className={`font-semibold ${plPositive ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {formatCurrencyCompact(holding.unrealizedPL)}
                      </p>
                      <p
                        className={`text-xs ${plPositive ? 'text-emerald-500/70' : 'text-rose-500/70'}`}
                      >
                        {formatPercent(holding.unrealizedPLPercent)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {summary.holdings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No holdings to display. Add some transactions to see performance
                data.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
