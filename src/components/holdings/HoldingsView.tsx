"use client"

import * as React from "react"
import {
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconFilter,
  IconLayoutGrid,
  IconLayoutList,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { usePortfolioStore } from "@/store/usePortfolioStore"
import { usePortfolioWithPrices } from "@/hooks/usePortfolioWithPrices"
import { AssetHolding, AssetType } from "@/types"
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog"
import { AssetDetailSheet } from "@/components/holdings/AssetDetailSheet"

function formatQuantity(value: number): string {
  if (value >= 1) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  }
  return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 8 })
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  STOCK: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  ETF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

const TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  CRYPTO: <IconCurrencyBitcoin className="size-5" />,
  STOCK: <IconCurrencyEuro className="size-5" />,
  ETF: <IconTrendingUp className="size-5" />,
}

interface HoldingCardProps {
  holding: AssetHolding
  onClick: () => void
}

function HoldingCard({ holding, onClick }: HoldingCardProps) {
  const isPositive = holding.unrealizedPL >= 0
  const is24hPositive = holding.change24hPercent >= 0

  return (
    <Card 
      className="cursor-pointer transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-lg ${TYPE_COLORS[holding.type]}`}>
              {TYPE_ICONS[holding.type]}
            </div>
            <div>
              <CardTitle className="text-base">{holding.symbol}</CardTitle>
              <p className="text-muted-foreground text-sm">{holding.name}</p>
            </div>
          </div>
          <Badge variant="outline" className={TYPE_COLORS[holding.type]}>
            {holding.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold">{formatCurrency(holding.totalValue)}</span>
          <div className={`flex items-center gap-1 text-sm ${is24hPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {is24hPositive ? <IconArrowUp className="size-4" /> : <IconArrowDown className="size-4" />}
            {formatPercent(holding.change24hPercent)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div>
            <p className="text-muted-foreground text-xs">Quantity</p>
            <p className="font-medium">{formatQuantity(holding.totalQuantity)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Avg. Cost</p>
            <p className="font-medium">{formatCurrency(holding.avgBuyPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Current Price</p>
            <p className="font-medium">{formatCurrency(holding.currentPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">P/L</p>
            <p className={`font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(holding.unrealizedPL)} ({formatPercent(holding.unrealizedPLPercent)})
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-muted-foreground text-xs">Portfolio Allocation</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{holding.allocationPercent.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HoldingsView() {
  const { summary } = usePortfolioWithPrices()
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<AssetType | "ALL">("ALL")
  const [sortBy, setSortBy] = React.useState<"value" | "name" | "pl" | "change24h">("value")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")
  const [selectedAsset, setSelectedAsset] = React.useState<AssetHolding | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 12,
  })

  // Filter and sort holdings
  const filteredHoldings = React.useMemo(() => {
    let holdings = [...summary.holdings]

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      holdings = holdings.filter(
        h => h.symbol.toLowerCase().includes(query) || h.name.toLowerCase().includes(query)
      )
    }

    // Filter by type
    if (typeFilter !== "ALL") {
      holdings = holdings.filter(h => h.type === typeFilter)
    }

    // Sort
    holdings.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "value":
          comparison = a.totalValue - b.totalValue
          break
        case "name":
          comparison = a.symbol.localeCompare(b.symbol)
          break
        case "pl":
          comparison = a.unrealizedPLPercent - b.unrealizedPLPercent
          break
        case "change24h":
          comparison = a.change24hPercent - b.change24hPercent
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return holdings
  }, [summary.holdings, searchQuery, typeFilter, sortBy, sortOrder])

  // Paginate holdings
  const paginatedHoldings = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    return filteredHoldings.slice(start, start + pagination.pageSize)
  }, [filteredHoldings, pagination])

  const totalPages = Math.ceil(filteredHoldings.length / pagination.pageSize)

  const handleAssetClick = (holding: AssetHolding) => {
    setSelectedAsset(holding)
    setSheetOpen(true)
  }

  const viewName = activePersonId === 'ALL' 
    ? 'Family Portfolio' 
    : persons.find(p => p.id === activePersonId)?.name || 'Portfolio'

  const cryptoCount = summary.holdings.filter(h => h.type === 'CRYPTO').length
  const stockCount = summary.holdings.filter(h => h.type === 'STOCK').length
  const etfCount = summary.holdings.filter(h => h.type === 'ETF').length

  // Table columns for list view
  const columns: ColumnDef<AssetHolding>[] = [
    {
      accessorKey: "symbol",
      header: "Asset",
      cell: ({ row }) => {
        const holding = row.original
        return (
          <button 
            className="flex items-center gap-3 text-left hover:opacity-80"
            onClick={() => handleAssetClick(holding)}
          >
            <div className={`flex size-8 items-center justify-center rounded-lg ${TYPE_COLORS[holding.type]}`}>
              {TYPE_ICONS[holding.type]}
            </div>
            <div>
              <div className="font-medium">{holding.symbol}</div>
              <div className="text-muted-foreground text-sm">{holding.name}</div>
            </div>
          </button>
        )
      },
    },
    {
      accessorKey: "currentPrice",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => {
        const holding = row.original
        return (
          <div className="text-right">
            <div>{formatCurrency(holding.currentPrice)}</div>
            <div className="text-muted-foreground text-xs">
              Avg: {formatCurrency(holding.avgBuyPrice)}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "totalQuantity",
      header: () => <div className="text-right">Quantity</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatQuantity(row.original.totalQuantity)}
        </div>
      ),
    },
    {
      accessorKey: "change24hPercent",
      header: () => <div className="text-right">24h Change</div>,
      cell: ({ row }) => {
        const holding = row.original
        const isPositive = holding.change24hPercent >= 0
        return (
          <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
            {formatPercent(holding.change24hPercent)}
          </div>
        )
      },
    },
    {
      accessorKey: "unrealizedPL",
      header: () => <div className="text-right">Unrealized P/L</div>,
      cell: ({ row }) => {
        const holding = row.original
        const isPositive = holding.unrealizedPL >= 0
        return (
          <div className="text-right">
            <div className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
              {formatCurrency(holding.unrealizedPL)}
            </div>
            <div className={`text-xs ${isPositive ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
              {formatPercent(holding.unrealizedPLPercent)}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "allocationPercent",
      header: () => <div className="text-right">Allocation</div>,
      cell: ({ row }) => {
        const holding = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }}
              />
            </div>
            <span className="text-sm w-12 text-right">{holding.allocationPercent.toFixed(1)}%</span>
          </div>
        )
      },
    },
    {
      accessorKey: "totalValue",
      header: () => <div className="text-right">Value</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold">
          {formatCurrency(row.original.totalValue)}
        </div>
      ),
    },
  ]

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data: paginatedHoldings,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    getRowId: (row) => row.symbol,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Holdings</h1>
            <p className="text-muted-foreground">
              {filteredHoldings.length} assets in {viewName} • {formatCurrency(summary.totalBalance)} total value
            </p>
          </div>
          <AddTransactionDialog>
            <Button className="gap-2">
              <IconPlus className="size-4" />
              Add Transaction
            </Button>
          </AddTransactionDialog>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-0">
              <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_COLORS.CRYPTO}`}>
                <IconCurrencyBitcoin className="size-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Crypto</p>
                <p className="text-xl font-semibold">{cryptoCount} assets</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-0">
              <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_COLORS.STOCK}`}>
                <IconCurrencyEuro className="size-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Stocks</p>
                <p className="text-xl font-semibold">{stockCount} assets</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-0">
              <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_COLORS.ETF}`}>
                <IconTrendingUp className="size-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">ETFs</p>
                <p className="text-xl font-semibold">{etfCount} assets</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-0">
              <div className={`flex size-12 items-center justify-center rounded-lg ${summary.totalPL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {summary.totalPL >= 0 ? <IconTrendingUp className="size-6" /> : <IconTrendingDown className="size-6" />}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total P/L</p>
                <p className={`text-xl font-semibold ${summary.totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(summary.totalPL)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AssetType | "ALL")}>
              <SelectTrigger className="w-36">
                <IconFilter className="size-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CRYPTO">Crypto</SelectItem>
                <SelectItem value="STOCK">Stocks</SelectItem>
                <SelectItem value="ETF">ETFs</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <IconSortAscending className="size-4" />
                  Sort
                  <IconChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSortBy("value"); setSortOrder("desc") }}>
                  Value (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy("value"); setSortOrder("asc") }}>
                  Value (Low to High)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy("name"); setSortOrder("asc") }}>
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy("pl"); setSortOrder("desc") }}>
                  P/L (Best First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy("pl"); setSortOrder("asc") }}>
                  P/L (Worst First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortBy("change24h"); setSortOrder("desc") }}>
                  24h Change (Best First)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <IconLayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <IconLayoutList className="size-4" />
            </Button>
          </div>
        </div>

        {/* Holdings Grid/List */}
        {viewMode === "grid" ? (
          <>
            {paginatedHoldings.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedHoldings.map((holding) => (
                  <HoldingCard
                    key={holding.symbol}
                    holding={holding}
                    onClick={() => handleAssetClick(holding)}
                  />
                ))}
              </div>
            ) : (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <IconCurrencyEuro className="size-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No holdings found</h3>
                  <p className="text-muted-foreground text-sm">
                    {searchQuery || typeFilter !== "ALL"
                      ? "Try adjusting your filters"
                      : "Add a transaction to get started"}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleAssetClick(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No holdings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-muted-foreground text-sm">
            {filteredHoldings.length > 0 ? (
              <>
                Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredHoldings.length)} of{" "}
                {filteredHoldings.length} holdings
              </>
            ) : (
              "No holdings"
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))}
              disabled={pagination.pageIndex === 0}
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))}
              disabled={pagination.pageIndex === 0}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="text-sm px-2">
              {pagination.pageIndex + 1} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
              disabled={pagination.pageIndex >= totalPages - 1}
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPagination(p => ({ ...p, pageIndex: totalPages - 1 }))}
              disabled={pagination.pageIndex >= totalPages - 1}
            >
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Asset Detail Sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}

