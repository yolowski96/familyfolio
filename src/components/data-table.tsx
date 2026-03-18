"use client"

import * as React from "react"
import {
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePrivacy } from "@/components/providers/PrivacyProvider"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { usePortfolioWithPrices } from "@/hooks/usePortfolioWithPrices"
import { AssetType } from "@/types"

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  STOCK: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  ETF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

export function DataTable() {
  usePrivacy();
  const { summary } = usePortfolioWithPrices()
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)
  const isInitialized = usePortfolioStore((state) => state.isInitialized)
  const storeLoading = usePortfolioStore((state) => state.isLoading)
  const [sortField, setSortField] = React.useState<string | null>(null)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc')

  const holdings = summary.holdings

  const sortedHoldings = React.useMemo(() => {
    if (!sortField) return holdings
    return [...holdings].sort((a, b) => {
      const aVal = (a as any)[sortField] ?? 0
      const bVal = (b as any)[sortField] ?? 0
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [holdings, sortField, sortDir])

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const viewName = activePersonId === 'ALL' 
    ? 'Family Portfolio' 
    : persons.find(p => p.id === activePersonId)?.name || 'Portfolio'

  const SortButton = ({ field, children, className = "" }: { field: string; children: React.ReactNode; className?: string }) => (
    <Button variant="ghost" size="sm" className={`-ml-3 h-8 ${className}`} onClick={() => toggleSort(field)}>
      {children}
      <span className="ml-1 text-xs opacity-50">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </Button>
  )

  if (!isInitialized || storeLoading) {
    return (
      <div className="w-full flex flex-col gap-4 px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Holdings</h2>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">24h</TableHead>
                <TableHead className="text-right">P/L</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-14 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4 px-4 lg:px-6">
      <h2 className="text-lg font-semibold">Holdings</h2>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead><SortButton field="symbol">Asset</SortButton></TableHead>
              <TableHead className="text-right"><SortButton field="currentPrice">Price</SortButton></TableHead>
              <TableHead className="text-right"><SortButton field="totalQuantity">Balance</SortButton></TableHead>
              <TableHead className="text-right"><SortButton field="change24hPercent">24h</SortButton></TableHead>
              <TableHead className="text-right"><SortButton field="unrealizedPL">P/L</SortButton></TableHead>
              <TableHead className="text-right"><SortButton field="totalValue">Value</SortButton></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHoldings.length > 0 ? (
              sortedHoldings.map((holding) => {
                const isPositive = holding.unrealizedPL >= 0
                const is24hPositive = holding.change24hPercent >= 0
                return (
                  <TableRow key={holding.symbol} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${TYPE_COLORS[holding.type]} w-16 justify-center`}>
                          {holding.type}
                        </Badge>
                        <div>
                          <div className="font-medium">{holding.symbol}</div>
                          <div className="text-muted-foreground text-sm">{holding.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatCurrency(holding.currentPrice)}</div>
                      <div className="text-muted-foreground text-xs">Avg: {formatCurrency(holding.avgBuyPrice)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatQuantity(holding.totalQuantity)}</div>
                      <div className="text-muted-foreground text-xs">{holding.allocationPercent.toFixed(1)}%</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`flex items-center justify-end gap-1 ${is24hPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {is24hPositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                        {formatPercent(holding.change24hPercent)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                        {formatCurrency(holding.unrealizedPL)}
                      </div>
                      <div className={`text-xs ${isPositive ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                        {formatPercent(holding.unrealizedPLPercent)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(holding.totalValue)}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No holdings found. Add a transaction to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-muted-foreground text-sm">
        Showing {sortedHoldings.length} holdings in {viewName}
      </div>
    </div>
  )
}
