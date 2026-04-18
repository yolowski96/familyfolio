'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  useFilteredTransactions,
  usePortfolioStore,
} from '@/store/usePortfolioStore';
import { usePortfolioWithPrices } from '@/hooks/usePortfolioWithPrices';
import { buildPortfolioHistory } from '@/lib/portfolio/history';

const chartConfig = {
  value: {
    label: 'Portfolio Value',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

const TIME_RANGES = {
  '1d': { days: 1, label: '1 day' },
  '1w': { days: 7, label: '1 week' },
  '1m': { days: 30, label: '1 month' },
  '1y': { days: 365, label: '1 year' },
  all: { days: 730, label: 'all time' },
} as const;

type TimeRangeKey = keyof typeof TIME_RANGES;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<TimeRangeKey>('1m');
  const { summary, livePrices } = usePortfolioWithPrices();
  const persons = usePortfolioStore((state) => state.persons);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);
  const isInitialized = usePortfolioStore((state) => state.isInitialized);
  const storeLoading = usePortfolioStore((state) => state.isLoading);
  const transactions = useFilteredTransactions();

  React.useEffect(() => {
    if (isMobile) setTimeRange('1w');
  }, [isMobile]);

  const days = TIME_RANGES[timeRange].days;

  const chartData = React.useMemo(() => {
    if (transactions.length === 0 || summary.totalBalance === 0) return [];
    return buildPortfolioHistory(transactions, livePrices, days);
  }, [transactions, livePrices, days, summary.totalBalance]);

  const viewName =
    activePersonId === 'ALL'
      ? 'Family Portfolio'
      : persons.find((p) => p.id === activePersonId)?.name || 'Portfolio';

  const periodLabel = TIME_RANGES[timeRange].label;

  if (!isInitialized || storeLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Portfolio Value</CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <div className="w-full h-full bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Portfolio Value</CardTitle>
          <CardDescription>
            Add transactions to see your portfolio chart
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">No data to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Portfolio Value</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {viewName} holdings valued at today&apos;s prices over the last{' '}
            {periodLabel}
          </span>
          <span className="@[540px]/card:hidden">Last {periodLabel}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) =>
              value && setTimeRange(value as TimeRangeKey)
            }
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-3 @[540px]/card:flex"
          >
            <ToggleGroupItem value="1d">1D</ToggleGroupItem>
            <ToggleGroupItem value="1w">1W</ToggleGroupItem>
            <ToggleGroupItem value="1m">1M</ToggleGroupItem>
            <ToggleGroupItem value="1y">1Y</ToggleGroupItem>
            <ToggleGroupItem value="all">ALL</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as TimeRangeKey)}
          >
            <SelectTrigger
              className="flex w-24 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[540px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="1M" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1d" className="rounded-lg">
                1D
              </SelectItem>
              <SelectItem value="1w" className="rounded-lg">
                1W
              </SelectItem>
              <SelectItem value="1m" className="rounded-lg">
                1M
              </SelectItem>
              <SelectItem value="1y" className="rounded-lg">
                1Y
              </SelectItem>
              <SelectItem value="all" className="rounded-lg">
                ALL
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-value)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              width={60}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                  }}
                  formatter={(value) => [
                    `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                    'Value',
                  ]}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              stroke="var(--color-value)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
