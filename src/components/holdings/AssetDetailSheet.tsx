"use client"

import * as React from "react"
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconEdit,
  IconExternalLink,
  IconPlus,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { useFilteredTransactions, usePortfolioStore, DbTransaction } from "@/store/usePortfolioStore"
import { AssetHolding, AssetType } from "@/types"
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog"

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  STOCK: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  ETF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

const TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  CRYPTO: <IconCurrencyBitcoin className="size-6" />,
  STOCK: <IconCurrencyEuro className="size-6" />,
  ETF: <IconTrendingUp className="size-6" />,
}

const ITEMS_PER_PAGE = 5

interface AssetDetailSheetProps {
  asset: AssetHolding | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetDetailSheet({ asset, open, onOpenChange }: AssetDetailSheetProps) {
  const transactions = useFilteredTransactions()
  const persons = usePortfolioStore((state) => state.persons)
  const activePersonId = usePortfolioStore((state) => state.activePersonId)
  const updateTransactionAction = usePortfolioStore((state) => state.updateTransaction)
  const loadTransactions = usePortfolioStore((state) => state.loadTransactions)
  const loadPersons = usePortfolioStore((state) => state.loadPersons)
  const [currentPage, setCurrentPage] = React.useState(0)

  React.useEffect(() => {
    if (open) {
      if (transactions.length === 0) loadTransactions()
      if (persons.length === 0) loadPersons()
    }
  }, [open, transactions.length, persons.length, loadTransactions, loadPersons])
  
  // Edit transaction state
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editingTransaction, setEditingTransaction] = React.useState<DbTransaction | null>(null)
  const [editQuantity, setEditQuantity] = React.useState('')
  const [editPrice, setEditPrice] = React.useState('')
  const [editTotalAmount, setEditTotalAmount] = React.useState('')
  const [editLastEdited, setEditLastEdited] = React.useState<'quantity' | 'total' | null>(null)
  const [editDate, setEditDate] = React.useState('')
  const [editType, setEditType] = React.useState<'BUY' | 'SELL'>('BUY')

  // Reset page when asset changes
  React.useEffect(() => {
    setCurrentPage(0)
  }, [asset?.symbol])

  // Filter transactions for this specific asset
  const assetTransactions = React.useMemo(() => {
    if (!asset) return []
    return transactions
      .filter(t => t.assetSymbol === asset.symbol)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, asset])

  // Pagination
  const totalPages = Math.ceil(assetTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = React.useMemo(() => {
    const start = currentPage * ITEMS_PER_PAGE
    return assetTransactions.slice(start, start + ITEMS_PER_PAGE)
  }, [assetTransactions, currentPage])

  // Calculate transaction stats
  const transactionStats = React.useMemo(() => {
    if (!assetTransactions.length) return { buyCount: 0, sellCount: 0, totalBought: 0, totalSold: 0 }
    
    let buyCount = 0
    let sellCount = 0
    let totalBought = 0
    let totalSold = 0

    assetTransactions.forEach(t => {
      if (t.type === 'BUY') {
        buyCount++
        totalBought += Number(t.quantity) * Number(t.pricePerUnit)
      } else {
        sellCount++
        totalSold += Number(t.quantity) * Number(t.pricePerUnit)
      }
    })

    return { buyCount, sellCount, totalBought, totalSold }
  }, [assetTransactions])

  const getPersonName = (personId: string) => {
    return persons.find(p => p.id === personId)?.name || 'Unknown'
  }

  const handleEditTransaction = (transaction: DbTransaction) => {
    setEditingTransaction(transaction)
    const qty = Number(transaction.quantity)
    const price = Number(transaction.pricePerUnit)
    setEditQuantity(qty.toString())
    setEditPrice(price.toString())
    setEditTotalAmount((qty * price).toFixed(2))
    setEditLastEdited(null)
    setEditDate(transaction.date.split('T')[0])
    setEditType(transaction.type)
    setEditDialogOpen(true)
  }

  // Auto-calculate handlers for edit dialog
  const handleEditPriceChange = (value: string) => {
    setEditPrice(value)
    const price = parseFloat(value)
    if (!isNaN(price) && price > 0) {
      if (editLastEdited === 'total' && editTotalAmount) {
        const total = parseFloat(editTotalAmount)
        if (!isNaN(total)) {
          setEditQuantity((total / price).toString())
        }
      } else if (editLastEdited === 'quantity' && editQuantity) {
        const qty = parseFloat(editQuantity)
        if (!isNaN(qty)) {
          setEditTotalAmount((qty * price).toFixed(2))
        }
      }
    }
  }

  const handleEditQuantityChange = (value: string) => {
    setEditQuantity(value)
    setEditLastEdited('quantity')
    const qty = parseFloat(value)
    const price = parseFloat(editPrice)
    if (!isNaN(qty) && !isNaN(price) && price > 0) {
      setEditTotalAmount((qty * price).toFixed(2))
    } else if (value === '') {
      setEditTotalAmount('')
    }
  }

  const handleEditTotalAmountChange = (value: string) => {
    setEditTotalAmount(value)
    setEditLastEdited('total')
    const total = parseFloat(value)
    const price = parseFloat(editPrice)
    if (!isNaN(total) && !isNaN(price) && price > 0) {
      setEditQuantity((total / price).toString())
    } else if (value === '') {
      setEditQuantity('')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingTransaction) return

    await updateTransactionAction(editingTransaction.id, {
      quantity: parseFloat(editQuantity),
      pricePerUnit: parseFloat(editPrice),
      date: editDate,
      type: editType,
    })

    setEditDialogOpen(false)
    setEditingTransaction(null)
  }

  if (!asset) return null

  const isPositive = asset.unrealizedPL >= 0
  const is24hPositive = asset.change24hPercent >= 0

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto px-8">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className={`flex size-14 items-center justify-center rounded-xl ${TYPE_COLORS[asset.type]}`}>
                {TYPE_ICONS[asset.type]}
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl">{asset.symbol}</SheetTitle>
                <SheetDescription>{asset.name}</SheetDescription>
              </div>
              <Badge variant="outline" className={TYPE_COLORS[asset.type]}>
                {asset.type}
              </Badge>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Value Overview */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Value</p>
                    <p className="text-3xl font-bold">{formatCurrency(asset.totalValue)}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-lg font-medium ${is24hPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {is24hPositive ? <IconArrowUp className="size-5" /> : <IconArrowDown className="size-5" />}
                    {formatPercent(asset.change24hPercent)}
                    <span className="text-xs text-muted-foreground ml-1">24h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-muted-foreground text-xs">Current Price</p>
                  <p className="text-lg font-semibold">{formatCurrency(asset.currentPrice)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-muted-foreground text-xs">Avg. Buy Price</p>
                  <p className="text-lg font-semibold">{formatCurrency(asset.avgBuyPrice)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-muted-foreground text-xs">Quantity Held</p>
                  <p className="text-lg font-semibold">{formatQuantity(asset.totalQuantity)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-muted-foreground text-xs">Allocation</p>
                  <p className="text-lg font-semibold">{asset.allocationPercent.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>

            {/* P/L Card */}
            <Card className={isPositive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unrealized Profit/Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isPositive ? <IconTrendingUp className="size-6" /> : <IconTrendingDown className="size-6" />}
                    <span className="text-2xl font-bold">{formatCurrency(asset.unrealizedPL)}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={isPositive ? 'border-emerald-500/30 text-emerald-500' : 'border-rose-500/30 text-rose-500'}
                  >
                    {formatPercent(asset.unrealizedPLPercent)}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cost Basis</p>
                    <p className="font-medium">{formatCurrency(asset.costBasis)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Market Value</p>
                    <p className="font-medium">{formatCurrency(asset.totalValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Tab */}
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="transactions" className="flex-1">
                  Transactions ({assetTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex-1">
                  Statistics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-muted-foreground text-sm">
                    {assetTransactions.length} transaction{assetTransactions.length !== 1 ? 's' : ''}
                  </p>
                  <AddTransactionDialog
                    initialAsset={{
                      assetType: asset.type,
                      symbol: asset.symbol,
                      assetName: asset.name,
                    }}
                  >
                    <Button size="sm" variant="outline" className="gap-1">
                      <IconPlus className="size-3" />
                      Add
                    </Button>
                  </AddTransactionDialog>
                </div>

                {assetTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {paginatedTransactions.map((tx) => (
                      <TransactionRow 
                        key={tx.id} 
                        transaction={tx} 
                        portfolioName={getPersonName(tx.personId)}
                        showPortfolio={activePersonId === 'ALL'}
                        onEdit={handleEditTransaction}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="py-8">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                      <IconCalendar className="size-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No transactions found</p>
                    </CardContent>
                  </Card>
                )}

                {/* Pagination under transactions */}
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t pb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <IconChevronLeft className="size-4" />
                  </Button>
                  <span className="text-muted-foreground text-sm px-2 min-w-[60px] text-center">
                    {currentPage + 1} / {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <IconChevronRight className="size-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-4 space-y-4 pb-4">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Buy Orders</span>
                      <span className="font-medium">{transactionStats.buyCount}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Sell Orders</span>
                      <span className="font-medium">{transactionStats.sellCount}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Total Bought</span>
                      <span className="font-medium text-emerald-500">{formatCurrency(transactionStats.totalBought)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Total Sold</span>
                      <span className="font-medium text-rose-500">{formatCurrency(transactionStats.totalSold)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Net Investment</span>
                      <span className="font-medium">{formatCurrency(transactionStats.totalBought - transactionStats.totalSold)}</span>
                    </div>
                  </CardContent>
                </Card>

                {asset.type === 'CRYPTO' && (
                  <Button variant="outline" className="w-full gap-2">
                    <IconExternalLink className="size-4" />
                    View on CoinGecko
                  </Button>
                )}
                {asset.type === 'STOCK' && (
                  <Button variant="outline" className="w-full gap-2">
                    <IconExternalLink className="size-4" />
                    View on Yahoo Finance
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update the details of this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editType">Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as 'BUY' | 'SELL')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPrice">Price per Unit (EUR)</Label>
              <Input
                id="editPrice"
                type="number"
                step="any"
                value={editPrice}
                onChange={(e) => handleEditPriceChange(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editQuantity">Quantity</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  step="any"
                  value={editQuantity}
                  onChange={(e) => handleEditQuantityChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculates with total
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editTotalAmount">Total Amount (EUR)</Label>
                <Input
                  id="editTotalAmount"
                  type="number"
                  step="any"
                  value={editTotalAmount}
                  onChange={(e) => handleEditTotalAmountChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Total = Quantity × Price
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editDate">Date</Label>
              <Input
                id="editDate"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editQuantity || !editPrice || !editDate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface TransactionRowProps {
  transaction: DbTransaction
  portfolioName: string
  showPortfolio: boolean
  onEdit: (transaction: DbTransaction) => void
}

function TransactionRow({ transaction, portfolioName, showPortfolio, onEdit }: TransactionRowProps) {
  const isBuy = transaction.type === 'BUY'
  const total = Number(transaction.quantity) * Number(transaction.pricePerUnit)

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-lg ${isBuy ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {isBuy ? <IconArrowDown className="size-5" /> : <IconArrowUp className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isBuy ? 'Buy' : 'Sell'}
            </span>
            {showPortfolio && (
              <Badge variant="secondary" className="text-xs">
                {portfolioName}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {format(new Date(transaction.date), 'MMM d, yyyy')} • {formatQuantity(Number(transaction.quantity))} @ {formatCurrency(Number(transaction.pricePerUnit))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className={`font-medium ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(transaction)}
          >
            <IconEdit className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
