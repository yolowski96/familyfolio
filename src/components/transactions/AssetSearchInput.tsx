'use client';

import { useState, useEffect, useRef } from 'react';
import { IconSearch, IconLoader2, IconCoin, IconChartLine, IconChartPie } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';
import { AssetType } from '@/types';
import type { AssetSearchResult } from '@/types/transactionSearch';
import { cn } from '@/lib/utils';

/** @deprecated Use `AssetSearchResult` from `@/types/transactionSearch`. */
export type SearchResult = AssetSearchResult;

interface AssetSearchInputProps {
  transactionType: 'BUY' | 'SELL';
  assetType: AssetType;
  existingHoldings: Array<{ symbol: string; name: string; type: AssetType; quantity: number }>;
  onSelectAsset: (result: AssetSearchResult) => void;
  disabled?: boolean;
}

export function AssetSearchInput({
  transactionType,
  assetType,
  existingHoldings,
  onSelectAsset,
  disabled,
}: AssetSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search for assets when query changes
  useEffect(() => {
    async function searchAssets() {
      // For SELL mode, filter existing holdings locally
      if (transactionType === 'SELL') {
        if (debouncedQuery.length === 0) {
          setSearchResults([]);
          setShowResults(false);
          return;
        }

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
        const response = await fetch('/api/prices/search', {
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

  const handleSelect = (result: SearchResult) => {
    onSelectAsset(result);
    setSearchQuery('');
    setShowResults(false);
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

  return (
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
            if (searchQuery.length > 0 && searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          className="pl-10"
          disabled={disabled}
        />
        {isSearching && (
          <IconLoader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={`${result.symbol}-${index}`}
                type="button"
                onClick={() => handleSelect(result)}
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
          <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-popover border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
            No results found. You can still add manually below.
          </div>
        )}
      </div>

      {/* No holdings message for SELL */}
      {transactionType === 'SELL' && existingHoldings.length === 0 && (
        <p className="text-sm text-muted-foreground">No assets available to sell in this portfolio.</p>
      )}
    </div>
  );
}
