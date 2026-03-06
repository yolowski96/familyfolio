"use client"

import * as React from "react"
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconDownload,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconTrash,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import { format, subDays, subMonths, isAfter, isBefore, parseISO } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { useFilteredTransactions, usePortfolioStore, DbTransaction } from "@/store/usePortfolioStore"
import { AssetType } from "@/types"
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog"
import { toast } from "sonner"

const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  STOCK: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  ETF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

const TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  CRYPTO: <IconCurrencyBitcoin className="size-4" />,
  STOCK: <IconCurrencyEuro className="size-4" />,
  ETF: <IconTrendingUp className="size-4" />,
}

type DateRange = "all" | "7d" | "30d" | "90d" | "1y"

export function TransactionsView() {
  const transactions = useFilteredTransactions()
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)
  const deleteTransaction = usePortfolioStore((state) => state.deleteTransaction)
  const isInitialized = usePortfolioStore((state) => state.isInitialized)
  const storeLoading = usePortfolioStore((state) => state.isLoading)
  
  // Filters
  const [searchQuery, setSearchQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<AssetType | "ALL">("ALL")
  const [transactionTypeFilter, setTransactionTypeFilter] = React.useState<"BUY" | "SELL" | "ALL">("ALL")
  const [portfolioFilter, setPortfolioFilter] = React.useState<string>("ALL")
  const [dateRange, setDateRange] = React.useState<DateRange>("all")
  
  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "date", desc: true }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 15,
  })

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    let filtered = [...transactions]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        t => t.assetSymbol.toLowerCase().includes(query) || 
             t.assetName.toLowerCase().includes(query)
      )
    }

    // Asset type filter
    if (typeFilter !== "ALL") {
      filtered = filtered.filter(t => t.assetType === typeFilter)
    }

    // Transaction type filter
    if (transactionTypeFilter !== "ALL") {
      filtered = filtered.filter(t => t.type === transactionTypeFilter)
    }

    // Person filter (only when viewing ALL persons)
    if (activePersonId === "ALL" && portfolioFilter !== "ALL") {
      filtered = filtered.filter(t => t.personId === portfolioFilter)
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date()
      let startDate: Date
      switch (dateRange) {
        case "7d":
          startDate = subDays(now, 7)
          break
        case "30d":
          startDate = subMonths(now, 1)
          break
        case "90d":
          startDate = subMonths(now, 3)
          break
        case "1y":
          startDate = subMonths(now, 12)
          break
        default:
          startDate = new Date(0)
      }
      filtered = filtered.filter(t => isAfter(parseISO(t.date), startDate))
    }

    return filtered
  }, [transactions, searchQuery, typeFilter, transactionTypeFilter, portfolioFilter, activePersonId, dateRange])

  // Calculate summary stats
  const stats = React.useMemo(() => {
    const totalBuys = filteredTransactions
      .filter(t => t.type === "BUY")
      .reduce((sum, t) => sum + Number(t.quantity) * Number(t.pricePerUnit), 0)
    
    const totalSells = filteredTransactions
      .filter(t => t.type === "SELL")
      .reduce((sum, t) => sum + Number(t.quantity) * Number(t.pricePerUnit), 0)
    
    const buyCount = filteredTransactions.filter(t => t.type === "BUY").length
    const sellCount = filteredTransactions.filter(t => t.type === "SELL").length

    return { totalBuys, totalSells, buyCount, sellCount, netFlow: totalBuys - totalSells }
  }, [filteredTransactions])

  const getPersonName = (personId: string) => {
    return persons.find(p => p.id === personId)?.name || 'Unknown'
  }

  // Table columns
  const columns: ColumnDef<DbTransaction>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <IconCalendar className="size-4 text-muted-foreground" />
          <span>{format(parseISO(row.original.date), "MMM d, yyyy")}</span>
        </div>
      ),
      sortingFn: (a, b) => {
        return new Date(a.original.date).getTime() - new Date(b.original.date).getTime()
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const isBuy = row.original.type === "BUY"
        return (
          <Badge 
            variant="outline" 
            className={isBuy 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
            }
          >
            {isBuy ? (
              <IconArrowDown className="size-3 mr-1" />
            ) : (
              <IconArrowUp className="size-3 mr-1" />
            )}
            {row.original.type}
          </Badge>
        )
      },
    },
    {
      accessorKey: "assetSymbol",
      header: "Asset",
      cell: ({ row }) => {
        const tx = row.original
        return (
          <div className="flex items-center gap-3">
            <div className={`flex size-8 items-center justify-center rounded-lg ${TYPE_COLORS[tx.assetType]}`}>
              {TYPE_ICONS[tx.assetType]}
            </div>
            <div>
              <div className="font-medium">{tx.assetSymbol}</div>
              <div className="text-muted-foreground text-sm">{tx.assetName}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "quantity",
      header: () => <div className="text-right">Quantity</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatQuantity(Number(row.original.quantity))}
        </div>
      ),
    },
    {
      accessorKey: "pricePerUnit",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(Number(row.original.pricePerUnit))}
        </div>
      ),
    },
    {
      id: "total",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => {
        const total = Number(row.original.quantity) * Number(row.original.pricePerUnit)
        const isBuy = row.original.type === "BUY"
        return (
          <div className={`text-right font-semibold ${isBuy ? "text-emerald-500" : "text-rose-500"}`}>
            {isBuy ? "-" : "+"}{formatCurrency(total)}
          </div>
        )
      },
    },
    ...(activePersonId === "ALL" ? [{
      accessorKey: "personId",
      header: "Person",
      cell: ({ row }: { row: { original: DbTransaction } }) => (
        <Badge variant="secondary">
          {getPersonName(row.original.personId)}
        </Badge>
      ),
    } as ColumnDef<DbTransaction>] : []),
    {
      id: "actions",
      cell: ({ row }) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-rose-500">
              <IconTrash className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this {row.original.type.toLowerCase()} transaction for {row.original.quantity} {row.original.assetSymbol}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteTransaction(row.original.id)}
                className="bg-rose-600 hover:bg-rose-500"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const viewName = activePersonId === 'ALL' 
    ? 'All Portfolios' 
    : persons.find(p => p.id === activePersonId)?.name || 'Portfolio'

  const clearFilters = () => {
    setSearchQuery("")
    setTypeFilter("ALL")
    setTransactionTypeFilter("ALL")
    setPortfolioFilter("ALL")
    setDateRange("all")
  }

  const hasActiveFilters = searchQuery || typeFilter !== "ALL" || transactionTypeFilter !== "ALL" || portfolioFilter !== "ALL" || dateRange !== "all"

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export")
      return
    }

    const headers = [
      "Date", "Type", "Symbol", "Asset Name", "Asset Type",
      "Quantity", "Price Per Unit", "Total", "Fee", "Currency",
      "Person", "Exchange", "Notes",
    ]

    const rows = filteredTransactions.map((t) => {
      const total = Number(t.quantity) * Number(t.pricePerUnit)
      return [
        format(parseISO(t.date), "yyyy-MM-dd"),
        t.type,
        t.assetSymbol,
        `"${t.assetName.replace(/"/g, '""')}"`,
        t.assetType,
        Number(t.quantity),
        Number(t.pricePerUnit),
        total.toFixed(2),
        Number(t.fee || 0),
        t.currency,
        getPersonName(t.personId),
        t.exchange || "",
        t.notes ? `"${t.notes.replace(/"/g, '""')}"` : "",
      ].join(",")
    })

    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `familyfolio-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filteredTransactions.length} transactions`)
  }

  // Show loading state while data is being fetched
  if (!isInitialized || storeLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 pt-0">
                <div className="size-10 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-12 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                  <TableCell className="text-right"><div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" /></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted rounded animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            {filteredTransactions.length} transactions in {viewName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <IconDownload className="size-4" />
            Export
          </Button>
          <AddTransactionDialog>
            <Button className="gap-2">
              <IconPlus className="size-4" />
              Add Transaction
            </Button>
          </AddTransactionDialog>
        </div>
      </div>

      {/* Summary Stats */}
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
              <p className="text-xl font-semibold">{filteredTransactions.length}</p>
              <p className="text-muted-foreground text-xs">
                {dateRange === "all" ? "All time" : dateRange === "7d" ? "Last 7 days" : dateRange === "30d" ? "Last 30 days" : dateRange === "90d" ? "Last 90 days" : "Last year"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-36">
            <IconCalendar className="size-4 mr-2" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={transactionTypeFilter} onValueChange={(v) => setTransactionTypeFilter(v as "BUY" | "SELL" | "ALL")}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="BUY">Buy</SelectItem>
            <SelectItem value="SELL">Sell</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AssetType | "ALL")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Assets</SelectItem>
            <SelectItem value="CRYPTO">Crypto</SelectItem>
            <SelectItem value="STOCK">Stocks</SelectItem>
            <SelectItem value="ETF">ETFs</SelectItem>
          </SelectContent>
        </Select>

        {activePersonId === "ALL" && (
          <Select value={portfolioFilter} onValueChange={setPortfolioFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Person" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Persons</SelectItem>
              {persons.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
            Clear filters
          </Button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <IconSortAscending 
                          className={`size-4 ${header.column.getIsSorted() === "desc" ? "rotate-180" : ""}`} 
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
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
                  <div className="flex flex-col items-center gap-2">
                    <IconCalendar className="size-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No transactions found</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredTransactions.length > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredTransactions.length)} of{" "}
            {filteredTransactions.length} transactions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <span className="text-sm px-2">
              Page {pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

