import { PriceData, AssetType } from '@/types';
import { YahooFinanceProvider } from './providers/yahoo-finance';
import { CoinGeckoProvider } from './providers/coingecko';
import { exchangeRateProvider } from './providers/exchange-rate';

interface CacheEntry {
  data: PriceData;
  timestamp: number;
}

interface Asset {
  symbol: string;
  assetType: AssetType;
  exchange?: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
  assetType?: AssetType;
  id?: string;
}

export class PriceService {
  private readonly yahooProvider: YahooFinanceProvider;
  private readonly coinGeckoProvider: CoinGeckoProvider;
  private readonly cache: Map<string, CacheEntry>;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.yahooProvider = new YahooFinanceProvider();
    this.coinGeckoProvider = new CoinGeckoProvider(
      process.env.NEXT_PUBLIC_COINGECKO_API_KEY
    );
    this.cache = new Map();
  }

  /**
   * OPTIMIZED: Convert PriceData using cached exchange rates
   * No API call - uses rates fetched once and cached
   */
  private async convertPriceData(
    priceData: PriceData,
    targetCurrency: string
  ): Promise<PriceData> {
    // Already in target currency
    if (priceData.currency === targetCurrency) {
      return priceData;
    }

    // Convert price (uses cached rates - no API call!)
    const convertedPrice = await exchangeRateProvider.convert(
      priceData.price,
      priceData.currency,
      targetCurrency
    );

    if (!convertedPrice) {
      console.warn(`Failed to convert ${priceData.currency} to ${targetCurrency} for ${priceData.symbol}`);
      return priceData; // Return original on failure
    }

    // Convert change amount if exists
    let convertedChange = priceData.change24h;
    if (priceData.change24h) {
      const changeConverted = await exchangeRateProvider.convert(
        priceData.change24h,
        priceData.currency,
        targetCurrency
      );
      if (changeConverted) {
        convertedChange = changeConverted;
      }
    }

    // Convert chartPreviousClose if exists
    let convertedPreviousClose = priceData.chartPreviousClose;
    if (priceData.chartPreviousClose) {
      const previousCloseConverted = await exchangeRateProvider.convert(
        priceData.chartPreviousClose,
        priceData.currency,
        targetCurrency
      );
      if (previousCloseConverted) {
        convertedPreviousClose = previousCloseConverted;
      }
    }

    return {
      ...priceData,
      originalPrice: priceData.price,
      originalCurrency: priceData.currency,
      price: convertedPrice,
      currency: targetCurrency,
      change24h: convertedChange,
      chartPreviousClose: convertedPreviousClose,
    };
  }

  /**
   * Get price for a single asset with optional conversion
   */
  async getPrice(
    symbol: string,
    assetType: AssetType,
    exchange?: string,
    convertTo?: string
  ): Promise<PriceData | null> {
    // Check cache first
    const cacheKey = `${symbol}:${assetType}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      if (convertTo && convertTo !== cached.data.currency) {
        return this.convertPriceData(cached.data, convertTo);
      }
      return cached.data;
    }

    // Route to correct provider based on asset type
    let priceData: PriceData | null = null;

    if (assetType === 'CRYPTO') {
      // Use CoinGecko for crypto
      priceData = await this.coinGeckoProvider.fetchPrice(symbol);
    } else {
      // ETF or STOCK: Use Yahoo
      priceData = await this.yahooProvider.fetchPrice(symbol, exchange);
    }

    // Cache successful result
    if (priceData) {
      this.cache.set(cacheKey, {
        data: priceData,
        timestamp: Date.now(),
      });

      // Convert if needed
      if (convertTo && convertTo !== priceData.currency) {
        return this.convertPriceData(priceData, convertTo);
      }
    }

    return priceData;
  }

  /**
   * OPTIMIZED: Batch get prices with single exchange rate fetch
   * Fetches all asset prices, then converts ALL at once using cached rates
   */
  async batchGetPrices(assets: Asset[], convertTo?: string): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    // Group assets by type
    const cryptoAssets = assets.filter((a) => a.assetType === 'CRYPTO');
    const traditionalAssets = assets.filter((a) => a.assetType !== 'CRYPTO');

    // Check cache first for all assets
    const uncachedCryptoAssets: Asset[] = [];
    const uncachedTraditionalAssets: Asset[] = [];

    for (const asset of cryptoAssets) {
      const cacheKey = `${asset.symbol}:${asset.assetType}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        results.set(asset.symbol, cached.data);
      } else {
        uncachedCryptoAssets.push(asset);
      }
    }

    for (const asset of traditionalAssets) {
      const cacheKey = `${asset.symbol}:${asset.assetType}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        results.set(asset.symbol, cached.data);
      } else {
        uncachedTraditionalAssets.push(asset);
      }
    }

    // Fetch uncached assets in parallel from both providers
    const [cryptoPrices, traditionalPrices] = await Promise.all([
      uncachedCryptoAssets.length > 0
        ? this.coinGeckoProvider.batchFetch(uncachedCryptoAssets.map((a) => a.symbol))
        : Promise.resolve(new Map<string, PriceData>()),

      uncachedTraditionalAssets.length > 0
        ? this.yahooProvider.batchFetch(
            uncachedTraditionalAssets.map((a) => ({
              symbol: a.symbol,
              exchange: a.exchange,
            }))
          )
        : Promise.resolve(new Map<string, PriceData>()),
    ]);

    // Merge crypto results and cache
    for (const [symbol, data] of cryptoPrices) {
      results.set(symbol, data);

      // Cache it
      this.cache.set(`${symbol}:CRYPTO`, {
        data,
        timestamp: Date.now(),
      });
    }

    // Merge traditional results and cache
    for (const [symbol, data] of traditionalPrices) {
      results.set(symbol, data);

      // Cache it
      const asset = uncachedTraditionalAssets.find((a) => a.symbol === symbol);
      if (asset) {
        this.cache.set(`${symbol}:${asset.assetType}`, {
          data,
          timestamp: Date.now(),
        });
      }
    }

    // OPTIMIZATION: If conversion needed, do it all at once
    if (convertTo) {
      console.log(`💱 Converting ${results.size} prices to ${convertTo}...`);

      // Group prices by currency for efficient conversion
      const pricesBySourceCurrency = new Map<string, Array<[string, PriceData]>>();

      for (const [symbol, priceData] of results) {
        if (!pricesBySourceCurrency.has(priceData.currency)) {
          pricesBySourceCurrency.set(priceData.currency, []);
        }
        pricesBySourceCurrency.get(priceData.currency)!.push([symbol, priceData]);
      }

      // Convert each currency group
      // This triggers ONE exchange rate API call that fetches ALL rates
      // Then all conversions are local multiplication
      const convertedResults = new Map<string, PriceData>();

      for (const [sourceCurrency, priceEntries] of pricesBySourceCurrency) {
        if (sourceCurrency === convertTo) {
          // No conversion needed
          for (const [symbol, priceData] of priceEntries) {
            convertedResults.set(symbol, priceData);
          }
        } else {
          // Get exchange rate ONCE for this currency
          // (Uses cached rates - only first call per session hits API)
          const rate = await exchangeRateProvider.getRate(sourceCurrency, convertTo);

          if (rate) {
            // Apply SAME rate to ALL prices in this currency
            for (const [symbol, priceData] of priceEntries) {
              const convertedPrice = priceData.price * rate;
              const convertedChange = priceData.change24h
                ? priceData.change24h * rate
                : undefined;
              const convertedPreviousClose = priceData.chartPreviousClose
                ? priceData.chartPreviousClose * rate
                : undefined;

              convertedResults.set(symbol, {
                ...priceData,
                originalPrice: priceData.price,
                originalCurrency: priceData.currency,
                price: convertedPrice,
                currency: convertTo,
                change24h: convertedChange,
                chartPreviousClose: convertedPreviousClose,
              });
            }

            console.log(`  ✓ Converted ${priceEntries.length} ${sourceCurrency} prices using rate ${rate.toFixed(4)}`);
          } else {
            console.warn(`  ✗ Failed to get rate for ${sourceCurrency} → ${convertTo}`);
            // Keep original prices
            for (const [symbol, priceData] of priceEntries) {
              convertedResults.set(symbol, priceData);
            }
          }
        }
      }

      console.log(`✅ Batch conversion complete`);
      return convertedResults;
    }

    return results;
  }

  /**
   * Search for assets
   */
  async search(query: string, assetType?: AssetType): Promise<SearchResult[]> {
    if (assetType === 'CRYPTO') {
      // Search only crypto
      const results = await this.coinGeckoProvider.search(query);
      return results.map((r) => ({
        ...r,
        type: 'CRYPTO',
        assetType: 'CRYPTO' as AssetType,
      }));
    } else if (assetType === 'ETF' || assetType === 'STOCK') {
      // Search only stocks/ETFs
      const results = await this.yahooProvider.search(query);
      return results.map((r) => ({
        ...r,
        assetType: (r.type === 'ETF' ? 'ETF' : 'STOCK') as AssetType,
      }));
    } else {
      // Search both - run in parallel
      const [cryptoResults, yahooResults] = await Promise.all([
        this.coinGeckoProvider.search(query),
        this.yahooProvider.search(query),
      ]);

      return [
        ...cryptoResults.map((r) => ({
          ...r,
          type: 'CRYPTO',
          assetType: 'CRYPTO' as AssetType,
        })),
        ...yahooResults.map((r) => ({
          ...r,
          assetType: (r.type === 'ETF' ? 'ETF' : 'STOCK') as AssetType,
        })),
      ];
    }
  }

  /**
   * Get detailed crypto info
   */
  async getCryptoInfo(symbol: string) {
    return this.coinGeckoProvider.getCoinInfo(symbol);
  }

  /**
   * Clear all caches (price cache and exchange rate cache)
   */
  clearCache(): void {
    this.cache.clear();
    exchangeRateProvider.clearCache();
  }

  /**
   * Get cache statistics (useful for debugging)
   */
  getCacheStats(): {
    priceCache: { size: number; entries: string[]; ttl: number };
    exchangeRateCache: ReturnType<typeof exchangeRateProvider.getCacheInfo>;
  } {
    return {
      priceCache: {
        size: this.cache.size,
        entries: Array.from(this.cache.keys()),
        ttl: this.cacheTTL,
      },
      exchangeRateCache: exchangeRateProvider.getCacheInfo(),
    };
  }
}

// Export singleton instance
export const priceService = new PriceService();
