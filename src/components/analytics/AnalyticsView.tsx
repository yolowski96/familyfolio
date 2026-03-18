"use client"

import * as React from "react"
import {
  IconArrowUp,
  IconChartBar,
  IconChartPie,
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrencyCompact } from "@/lib/utils"
import { usePortfolioStore, useFilteredTransactions } from "@/store/usePortfolioStore"
import { usePortfolioWithPrices } from "@/hooks/usePortfolioWithPrices"
import { usePrivacy } from "@/components/providers/PrivacyProvider"
import { AssetType } from "@/types"
import { GoalTracker } from "@/components/analytics/GoalTracker"

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: '#06b6d4', // cyan-500
  STOCK: '#8b5cf6', // violet-500
  ETF: '#f59e0b', // amber-500
}

const TYPE_BG_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500',
  STOCK: 'bg-violet-500/10 text-violet-500',
  ETF: 'bg-amber-500/10 text-amber-500',
}

export function AnalyticsView() {
  usePrivacy();
  const { summary } = usePortfolioWithPrices()
  const transactions = useFilteredTransactions()
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)

  // Calculate performance metrics
  const performanceData = React.useMemo(() => {
    const winners = summary.holdings.filter(h => h.unrealizedPL > 0)
    const losers = summary.holdings.filter(h => h.unrealizedPL < 0)
    
    const totalWins = winners.reduce((sum, h) => sum + h.unrealizedPL, 0)
    const totalLosses = Math.abs(losers.reduce((sum, h) => sum + h.unrealizedPL, 0))
    
    const bestPerformer = summary.holdings.reduce((best, h) => 
      !best || h.unrealizedPLPercent > best.unrealizedPLPercent ? h : best, 
      summary.holdings[0]
    )
    
    const worstPerformer = summary.holdings.reduce((worst, h) => 
      !worst || h.unrealizedPLPercent < worst.unrealizedPLPercent ? h : worst, 
      summary.holdings[0]
    )

    return {
      winners,
      losers,
      totalWins,
      totalLosses,
      bestPerformer,
      worstPerformer,
      winRate: summary.holdings.length > 0 
        ? (winners.length / summary.holdings.length) * 100 
        : 0,
    }
  }, [summary.holdings])

  // Allocation pie chart data
  const allocationData = React.useMemo(() => {
    return summary.allocationByType.map(item => ({
      name: item.type,
      value: item.value,
      percent: item.percent,
    }))
  }, [summary.allocationByType])

  // Holdings by P/L for bar chart
  const holdingsPLData = React.useMemo(() => {
    return summary.holdings
      .sort((a, b) => b.unrealizedPL - a.unrealizedPL)
      .slice(0, 8)
      .map(h => ({
        name: h.symbol,
        pl: h.unrealizedPL,
        plPercent: h.unrealizedPLPercent,
        type: h.type,
      }))
  }, [summary.holdings])

  // Transaction volume by month
  const monthlyVolume = React.useMemo(() => {
    const volumeMap = new Map<string, { buys: number; sells: number }>()
    
    transactions.forEach(tx => {
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = volumeMap.get(monthKey) || { buys: 0, sells: 0 }
      const value = Number(tx.quantity) * Number(tx.pricePerUnit)
      
      if (tx.type === 'BUY') {
        existing.buys += value
      } else {
        existing.sells += value
      }
      
      volumeMap.set(monthKey, existing)
    })

    return Array.from(volumeMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        buys: data.buys,
        sells: data.sells,
      }))
  }, [transactions])

  const viewName = activePersonId === 'ALL' 
    ? 'Family Portfolio' 
    : persons.find(p => p.id === activePersonId)?.name || 'Portfolio'

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Performance insights and goals for {viewName}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex size-12 items-center justify-center rounded-lg ${summary.totalPL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {summary.totalPL >= 0 ? <IconTrendingUp className="size-6" /> : <IconTrendingDown className="size-6" />}
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total P/L</p>
                  <p className={`text-xl font-semibold ${summary.totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrencyCompact(summary.totalPL)}
                  </p>
                  <p className={`text-xs ${summary.totalPL >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                    {formatPercent(summary.totalPLPercent)}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <IconArrowUp className="size-6" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Win Rate</p>
                  <p className="text-xl font-semibold">{performanceData.winRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {performanceData.winners.length} of {summary.holdings.length} assets
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <IconTrendingUp className="size-6" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total Gains</p>
                  <p className="text-xl font-semibold text-emerald-500">{formatCurrencyCompact(performanceData.totalWins)}</p>
                  <p className="text-xs text-muted-foreground">{performanceData.winners.length} winning positions</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                  <IconTrendingDown className="size-6" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Total Losses</p>
                  <p className="text-xl font-semibold text-rose-500">{formatCurrencyCompact(performanceData.totalLosses)}</p>
                  <p className="text-xs text-muted-foreground">{performanceData.losers.length} losing positions</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Allocation Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconChartPie className="size-5" />
                  Asset Allocation
                </CardTitle>
                <CardDescription>Portfolio distribution by asset type</CardDescription>
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
                            fill={TYPE_COLORS[entry.name as AssetType]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrencyCompact(value)}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  {allocationData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="size-3 rounded-full" 
                        style={{ backgroundColor: TYPE_COLORS[item.name as AssetType] }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {item.name} ({item.percent.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Volume Bar Chart */}
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
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="buys" name="Buys" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sells" name="Sells" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best/Worst Performers */}
          <div className="grid gap-6 lg:grid-cols-2">
            {performanceData.bestPerformer && (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-emerald-500 flex items-center gap-2">
                    <IconTrendingUp className="size-5" />
                    Best Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_BG_COLORS[performanceData.bestPerformer.type]}`}>
                        {performanceData.bestPerformer.type === 'CRYPTO' ? (
                          <IconCurrencyBitcoin className="size-6" />
                        ) : (
                          <IconCurrencyEuro className="size-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{performanceData.bestPerformer.symbol}</p>
                        <p className="text-muted-foreground text-sm">{performanceData.bestPerformer.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-500">
                        {formatPercent(performanceData.bestPerformer.unrealizedPLPercent)}
                      </p>
                      <p className="text-emerald-500/70">
                        {formatCurrencyCompact(performanceData.bestPerformer.unrealizedPL)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {performanceData.worstPerformer && (
              <Card className="border-rose-500/30 bg-rose-500/5">
                <CardHeader>
                  <CardTitle className="text-rose-500 flex items-center gap-2">
                    <IconTrendingDown className="size-5" />
                    Worst Performer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_BG_COLORS[performanceData.worstPerformer.type]}`}>
                        {performanceData.worstPerformer.type === 'CRYPTO' ? (
                          <IconCurrencyBitcoin className="size-6" />
                        ) : (
                          <IconCurrencyEuro className="size-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{performanceData.worstPerformer.symbol}</p>
                        <p className="text-muted-foreground text-sm">{performanceData.worstPerformer.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-rose-500">
                        {formatPercent(performanceData.worstPerformer.unrealizedPLPercent)}
                      </p>
                      <p className="text-rose-500/70">
                        {formatCurrencyCompact(performanceData.worstPerformer.unrealizedPL)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <GoalTracker />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* P/L by Asset */}
          <Card>
            <CardHeader>
              <CardTitle>Profit/Loss by Asset</CardTitle>
              <CardDescription>Unrealized gains and losses across your holdings</CardDescription>
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
                      formatter={(value: number, name: string) => [
                        formatCurrencyCompact(value),
                        'P/L'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="pl" 
                      radius={[0, 4, 4, 0]}
                    >
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

          {/* Holdings Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Holdings Performance</CardTitle>
              <CardDescription>Detailed performance metrics for each asset</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.holdings.map((holding) => (
                  <div 
                    key={holding.symbol}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-lg ${TYPE_BG_COLORS[holding.type]}`}>
                        {holding.type === 'CRYPTO' ? (
                          <IconCurrencyBitcoin className="size-5" />
                        ) : holding.type === 'ETF' ? (
                          <IconTrendingUp className="size-5" />
                        ) : (
                          <IconCurrencyEuro className="size-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{holding.symbol}</p>
                        <p className="text-muted-foreground text-sm">{holding.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">Value</p>
                        <p className="font-medium">{formatCurrencyCompact(holding.totalValue)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-xs">24h</p>
                        <p className={`font-medium ${holding.change24hPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatPercent(holding.change24hPercent)}
                        </p>
                      </div>
                      <div className="text-right min-w-24">
                        <p className="text-muted-foreground text-xs">P/L</p>
                        <p className={`font-semibold ${holding.unrealizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatCurrencyCompact(holding.unrealizedPL)}
                        </p>
                        <p className={`text-xs ${holding.unrealizedPL >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                          {formatPercent(holding.unrealizedPLPercent)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {summary.holdings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No holdings to display. Add some transactions to see performance data.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

