'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { IconPlus, IconSearch, IconLoader2, IconCoin, IconChartLine, IconChartPie } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { AssetType } from '@/types';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';

interface AddTransactionDialogProps {
  children?: React.ReactNode;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  assetType?: AssetType;
  exchange?: string;
  id?: string;
  quantity?: number; // For existing holdings
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AddTransactionDialog({ children }: AddTransactionDialogProps) {
  const persons = usePortfolioStore((state) => state.persons);
  const transactions = usePortfolioStore((state) => state.transactions);
  const activePersonId = usePortfolioStore((state) => state.activePersonId);
  const addTransactionAction = usePortfolioStore((state) => state.addTransaction);
  const [open, setOpen] = useState(false);
  
  // Form state
  const [personId, setPersonId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('STOCK');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState('');
  const [assetName, setAssetName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [lastEdited, setLastEdited] = useState<'quantity' | 'total' | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Calculate existing holdings for the selected person (for SELL mode)
  const existingHoldings = useMemo(() => {
    if (!personId) return [];

    // Filter transactions for selected person
    const personTransactions = transactions.filter(t => t.personId === personId);

    // Group by symbol and calculate quantities
    const holdingsMap = new Map<string, {
      symbol: string;
      name: string;
      type: AssetType;
      quantity: number;
    }>();

    for (const tx of personTransactions) {
      const existing = holdingsMap.get(tx.assetSymbol);
      const quantityDelta = tx.type === 'BUY' ? Number(tx.quantity) : -Number(tx.quantity);

      if (existing) {
        existing.quantity += quantityDelta;
      } else {
        holdingsMap.set(tx.assetSymbol, {
          symbol: tx.assetSymbol,
          name: tx.assetName,
          type: tx.assetType,
          quantity: quantityDelta,
        });
      }
    }

    // Filter out assets with zero or negative quantity
    return Array.from(holdingsMap.values()).filter(h => h.quantity > 0);
  }, [personId, transactions]);

  // Reset form and pre-select person when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset form when opening
      resetForm();
      // Pre-select person
      if (activePersonId !== 'ALL') {
        setPersonId(activePersonId);
      } else if (persons.length > 0) {
        setPersonId(persons[0].id);
      }
    }
  }, [open, activePersonId, persons]);

  // Search for assets when query changes (BUY mode: API search, SELL mode: filter existing)
  useEffect(() => {
    async function searchAssets() {
      // For SELL mode, filter existing holdings locally
      if (transactionType === 'SELL') {
        // Only show results if user has typed something
        if (debouncedQuery.length === 0) {
          setSearchResults([]);
          setShowResults(false);
          return;
        }
        
        // Filter holdings by query
        const query = debouncedQuery.toLowerCase();
        const filtered = existingHoldings.filter(h =>
          h.symbol.toLowerCase().includes(query) ||
          h.name.toLowerCase().includes(query)
        );
        setSearchResults(filtered.map(h => ({
          symbol: h.symbol,
          name: h.name,
          type: h.type,
          assetType: h.type,
          quantity: h.quantity,
        })));
        setShowResults(filtered.length > 0);
        setIsSearching(false);
        return;
      }

      // For BUY mode, search via API
      if (debouncedQuery.length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch('/api/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: debouncedQuery,
            assetType: assetType
          }),
        });

        if (response.ok) {
          const results = await response.json();
          setSearchResults(results.slice(0, 8));
          setShowResults(results.length > 0);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }

    searchAssets();
  }, [debouncedQuery, assetType, transactionType, existingHoldings]);

  // Reset when switching transaction type
  useEffect(() => {
    // Clear form fields when switching modes
    setSymbol('');
    setAssetName('');
    setQuantity('');
    setPricePerUnit('');
    setTotalAmount('');
    setLastEdited(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  }, [transactionType, personId]);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setSymbol('');
    setAssetName('');
    setQuantity('');
    setPricePerUnit('');
    setTotalAmount('');
    setLastEdited(null);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTransactionType('BUY');
    setAssetType('STOCK');
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Auto-calculate quantity or total based on which field was edited last
  const handlePricePerUnitChange = (value: string) => {
    setPricePerUnit(value);
    const price = parseFloat(value);
    if (!isNaN(price) && price > 0) {
      if (lastEdited === 'total' && totalAmount) {
        const total = parseFloat(totalAmount);
        if (!isNaN(total)) {
          setQuantity((total / price).toFixed(2));
        }
      } else if (lastEdited === 'quantity' && quantity) {
        const qty = parseFloat(quantity);
        if (!isNaN(qty)) {
          setTotalAmount((qty * price).toFixed(2));
        }
      }
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    setLastEdited('quantity');
    const qty = parseFloat(value);
    const price = parseFloat(pricePerUnit);
    if (!isNaN(qty) && !isNaN(price) && price > 0) {
      setTotalAmount((qty * price).toFixed(2));
    } else if (value === '') {
      setTotalAmount('');
    }
  };

  const handleTotalAmountChange = (value: string) => {
    setTotalAmount(value);
    setLastEdited('total');
    const total = parseFloat(value);
    const price = parseFloat(pricePerUnit);
    if (!isNaN(total) && !isNaN(price) && price > 0) {
      setQuantity((total / price).toFixed(2));
    } else if (value === '') {
      setQuantity('');
    }
  };

  const handleSelectAsset = (result: SearchResult) => {
    setSymbol(result.symbol);
    setAssetName(result.name);
    
    // Set asset type based on result
    if (result.assetType) {
      setAssetType(result.assetType);
    } else if (result.type) {
      // Map Yahoo Finance types to our types
      if (result.type === 'CRYPTOCURRENCY' || result.type === 'CRYPTO') {
        setAssetType('CRYPTO');
      } else if (result.type === 'ETF') {
        setAssetType('ETF');
      } else {
        setAssetType('STOCK');
      }
    }
    
    setSearchQuery('');
    setShowResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!personId || !symbol || !assetName || !quantity || !pricePerUnit) {
      return;
    }

    // For SELL, validate quantity doesn't exceed holdings
    if (transactionType === 'SELL') {
      const holding = existingHoldings.find(h => h.symbol === symbol);
      if (!holding || parseFloat(quantity) > holding.quantity) {
        alert(`Cannot sell more than you own (${holding?.quantity || 0} ${symbol})`);
        return;
      }
    }

    await addTransactionAction({
      personId,
      assetSymbol: symbol.toUpperCase(),
      assetName,
      assetType,
      type: transactionType,
      quantity: parseFloat(quantity),
      pricePerUnit: parseFloat(pricePerUnit),
      date: date,
    });

    resetForm();
    setOpen(false);
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'CRYPTO':
      case 'CRYPTOCURRENCY':
        return <IconCoin className="size-4 text-amber-500" />;
      case 'ETF':
        return <IconChartPie className="size-4 text-purple-500" />;
      default:
        return <IconChartLine className="size-4 text-blue-500" />;
    }
  };

  const selectedHolding = transactionType === 'SELL' 
    ? existingHoldings.find(h => h.symbol === symbol) 
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-emerald-500/20"
          >
            <IconPlus className="size-4 mr-2" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            New Transaction
          </DialogTitle>
          <DialogDescription>
            Record a buy or sell transaction for your portfolio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-5 py-4 overflow-y-auto flex-1 pr-2">
            {/* Person Selection */}
            <div className="grid gap-2">
              <Label htmlFor="person">Person</Label>
              <Select value={personId} onValueChange={(v) => {
                setPersonId(v);
                // Reset asset selection when changing person
                setSymbol('');
                setAssetName('');
                setSearchQuery('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="size-3 rounded-full" 
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Type */}
            <div className="grid gap-2">
              <Label>Transaction Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={transactionType === 'BUY' ? 'default' : 'outline'}
                  onClick={() => setTransactionType('BUY')}
                  className={transactionType === 'BUY' 
                    ? 'flex-1 bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'flex-1'
                  }
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={transactionType === 'SELL' ? 'default' : 'outline'}
                  onClick={() => setTransactionType('SELL')}
                  className={transactionType === 'SELL' 
                    ? 'flex-1 bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'flex-1'
                  }
                  disabled={existingHoldings.length === 0}
                >
                  Sell
                </Button>
              </div>
              {transactionType === 'BUY' && existingHoldings.length === 0 && personId && (
                <p className="text-xs text-muted-foreground">No assets to sell for this person yet.</p>
              )}
            </div>

            {/* Asset Type - Only show for BUY */}
            {transactionType === 'BUY' && (
              <div className="grid gap-2">
                <Label htmlFor="assetType">Asset Type</Label>
                <Select value={assetType} onValueChange={(v) => {
                  setAssetType(v as AssetType);
                  setSearchQuery('');
                  setSearchResults([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCK">Stock</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                    <SelectItem value="ETF">ETF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Asset Search / Selection */}
            <div className="grid gap-2" ref={searchRef}>
              <Label htmlFor="search">
                {transactionType === 'SELL' ? 'Select Asset to Sell' : 'Search Asset'}
              </Label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={
                    transactionType === 'SELL' 
                      ? 'Search your holdings...' 
                      : `Search ${assetType === 'CRYPTO' ? 'cryptocurrency' : assetType === 'ETF' ? 'ETF' : 'stock'}...`
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length > 0) {
                      setShowResults(true);
                    }
                  }}
                  onFocus={() => {
                    // Only show results if there's a query and results exist
                    if (searchQuery.length > 0 && searchResults.length > 0) {
                      setShowResults(true);
                    }
                  }}
                  className="pl-10"
                />
                {isSearching && (
                  <IconLoader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>
              
              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-[calc(100%-3rem)] mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.symbol}-${index}`}
                      type="button"
                      onClick={() => handleSelectAsset(result)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors",
                        index === 0 && "rounded-t-lg",
                        index === searchResults.length - 1 && "rounded-b-lg"
                      )}
                    >
                      {getAssetTypeIcon(result.assetType || result.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.symbol}</span>
                          {result.exchange && (
                            <span className="text-xs text-muted-foreground">{result.exchange}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{result.name}</p>
                      </div>
                      {/* Show quantity for SELL mode */}
                      {transactionType === 'SELL' && result.quantity !== undefined && (
                        <div className="text-right">
                          <span className="text-sm font-medium">{result.quantity.toLocaleString()}</span>
                          <p className="text-xs text-muted-foreground">available</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {/* No results message */}
              {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && transactionType === 'BUY' && (
                <div className="absolute z-50 w-[calc(100%-3rem)] mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                  No results found. You can still add manually below.
                </div>
              )}
              
              {/* No holdings message for SELL */}
              {transactionType === 'SELL' && existingHoldings.length === 0 && (
                <p className="text-sm text-muted-foreground">No assets available to sell in this portfolio.</p>
              )}
            </div>

            {/* Symbol and Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., BTC, AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="uppercase"
                  readOnly={transactionType === 'SELL'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assetName">Asset Name</Label>
                <Input
                  id="assetName"
                  placeholder="e.g., Bitcoin"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  readOnly={transactionType === 'SELL'}
                />
              </div>
            </div>

            {/* Show available quantity for SELL */}
            {transactionType === 'SELL' && selectedHolding && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available to sell</span>
                  <span className="font-medium">{selectedHolding.quantity.toLocaleString()} {selectedHolding.symbol}</span>
                </div>
              </div>
            )}

            {/* Price per Unit */}
            <div className="grid gap-2">
              <Label htmlFor="price">Price per Unit (EUR)</Label>
              <Input
                id="price"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={pricePerUnit}
                onChange={(e) => handlePricePerUnitChange(e.target.value)}
              />
            </div>

            {/* Quantity and Total Amount - auto-calculate between them */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="any"
                  min="0"
                  max={transactionType === 'SELL' && selectedHolding ? selectedHolding.quantity : undefined}
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter quantity or total to auto-calculate
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalAmount">Total Amount (EUR)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Total = Quantity × Price
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Total Preview */}
            {totalAmount && parseFloat(totalAmount) > 0 && (
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className={cn(
                    "text-xl font-semibold",
                    transactionType === 'SELL' ? "text-emerald-500" : ""
                  )}>
                    {transactionType === 'SELL' ? '+' : ''}{formatCurrency(parseFloat(totalAmount))}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-4 border-t mt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!personId || !symbol || !assetName || !quantity || !pricePerUnit}
              className={transactionType === 'SELL' 
                ? "bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white"
                : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white"
              }
            >
              {transactionType === 'SELL' ? 'Sell Asset' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
