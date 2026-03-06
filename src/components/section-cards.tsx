"use client"

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { usePortfolioWithPrices } from "@/hooks/usePortfolioWithPrices"

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function LoadingSkeleton() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-32 bg-muted rounded animate-pulse mt-2" />
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

export function SectionCards() {
  const { summary, isLoading: pricesLoading } = usePortfolioWithPrices()
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)
  const isInitialized = usePortfolioStore((state) => state.isInitialized)
  const storeLoading = usePortfolioStore((state) => state.isLoading)

  const total24hChange = summary.holdings.reduce((acc, h) => acc + h.change24h, 0)
  const total24hPercent = summary.totalBalance > 0 
    ? (total24hChange / (summary.totalBalance - total24hChange)) * 100 
    : 0

  const viewName = activePersonId === 'ALL' 
    ? 'All Portfolios' 
    : persons.find(p => p.id === activePersonId)?.name || 'Portfolio'

  if (!isInitialized || storeLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Balance */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Balance</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(summary.totalBalance)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={`shrink-0 ${total24hChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {total24hChange >= 0 ? <IconTrendingUp className="size-3 shrink-0" /> : <IconTrendingDown className="size-3 shrink-0" />}
              {formatPercent(total24hPercent)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {summary.holdings.length} assets tracked
          </div>
          <div className="text-muted-foreground">
            {viewName}
          </div>
        </CardFooter>
      </Card>

      {/* Total P/L */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Profit/Loss</CardDescription>
          <CardTitle className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${summary.totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(summary.totalPL)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={`shrink-0 ${summary.totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {summary.totalPL >= 0 ? <IconTrendingUp className="size-3 shrink-0" /> : <IconTrendingDown className="size-3 shrink-0" />}
              {formatPercent(summary.totalPLPercent)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className={`line-clamp-1 flex gap-2 font-medium ${summary.totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {summary.totalPL >= 0 ? 'Portfolio up' : 'Portfolio down'} all time
            {summary.totalPL >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Unrealized gains/losses
          </div>
        </CardFooter>
      </Card>

      {/* Top Performer */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Top Performer</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summary.topPerformer?.symbol || '--'}
          </CardTitle>
          <CardAction>
            {summary.topPerformer && (
              <Badge variant="outline" className={`shrink-0 ${summary.topPerformer.unrealizedPLPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {summary.topPerformer.unrealizedPLPercent >= 0 ? <IconTrendingUp className="size-3 shrink-0" /> : <IconTrendingDown className="size-3 shrink-0" />}
                {formatPercent(summary.topPerformer.unrealizedPLPercent)}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {summary.topPerformer?.name || 'No holdings yet'}
          </div>
          <div className="text-muted-foreground">
            {summary.topPerformer ? formatCurrency(summary.topPerformer.totalValue) : 'Add transactions to track'}
          </div>
        </CardFooter>
      </Card>

      {/* 24h Change */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>24h Change</CardDescription>
          <CardTitle className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${total24hChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(total24hChange)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={`shrink-0 ${total24hChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {total24hChange >= 0 ? <IconTrendingUp className="size-3 shrink-0" /> : <IconTrendingDown className="size-3 shrink-0" />}
              {formatPercent(total24hPercent)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className={`line-clamp-1 flex gap-2 font-medium ${total24hChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {total24hChange >= 0 ? 'Markets up today' : 'Markets down today'}
            {total24hChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Based on live price data
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
