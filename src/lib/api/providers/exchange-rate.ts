interface ExchangeRates {
  [currency: string]: number;
}

interface ExchangeRateData {
  base: string;
  rates: ExchangeRates;
  time_last_update_unix: number;
}

export class ExchangeRateProvider {
  private baseUrl = 'https://open.er-api.com/v6/latest';
  
  // Cache storage
  private ratesCache: {
    base: string;
    rates: ExchangeRates;
    timestamp: number;
  } | null = null;
  
  // Cache duration: 1-3 hours (configurable)
  private readonly MIN_CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour minimum
  private readonly MAX_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours maximum
  private cacheTTL = 2 * 60 * 60 * 1000; // Default: 2 hours
  
  constructor(cacheTTL?: number) {
    if (cacheTTL) {
      // Validate TTL is within bounds
      this.cacheTTL = Math.max(
        this.MIN_CACHE_TTL,
        Math.min(cacheTTL, this.MAX_CACHE_TTL)
      );
    }
  }
  
  /**
   * Get all exchange rates from base currency (cached)
   * This is the ONLY method that makes API calls
   */
  async getRates(baseCurrency: string = 'USD'): Promise<ExchangeRates | null> {
    // Check cache first
    if (this.ratesCache && 
        this.ratesCache.base === baseCurrency &&
        Date.now() - this.ratesCache.timestamp < this.cacheTTL) {
      return this.ratesCache.rates;
    }
    
    try {
      const url = `${this.baseUrl}/${baseCurrency}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Exchange rate API error:', response.status);
        
        if (this.ratesCache && this.ratesCache.base === baseCurrency) {
          return this.ratesCache.rates;
        }
        
        return null;
      }
      
      const data: ExchangeRateData = await response.json();
      
      if (!data.rates) {
        console.error('No rates in API response');
        return null;
      }
      
      // Update cache
      this.ratesCache = {
        base: baseCurrency,
        rates: data.rates,
        timestamp: Date.now(),
      };
      
      return data.rates;
      
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      
      if (this.ratesCache && this.ratesCache.base === baseCurrency) {
        return this.ratesCache.rates;
      }
      
      return null;
    }
  }
  
  /**
   * Convert amount from one currency to another (NO API CALL)
   * Uses cached rates for instant conversion
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Get rates (from cache or fetch once)
    const rates = await this.getRates(fromCurrency);
    
    if (!rates || !rates[toCurrency]) {
      console.error(`No rate found for ${fromCurrency} → ${toCurrency}`);
      return null;
    }
    
    // Simple multiplication - no API call!
    const rate = rates[toCurrency];
    return amount * rate;
  }
  
  /**
   * Get specific exchange rate (NO API CALL after first fetch)
   */
  async getRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    if (fromCurrency === toCurrency) {
      return 1;
    }
    
    const rates = await this.getRates(fromCurrency);
    
    if (!rates || !rates[toCurrency]) {
      return null;
    }
    
    return rates[toCurrency];
  }
  
  /**
   * Batch convert multiple amounts (SINGLE API CALL for all)
   * All conversions use the same cached rates
   */
  async batchConvert(
    conversions: Array<{
      amount: number;
      fromCurrency: string;
      toCurrency: string;
    }>
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    
    // Group by base currency to minimize API calls
    const uniqueBases = new Set(conversions.map(c => c.fromCurrency));
    
    // Fetch rates for each unique base (usually just USD)
    for (const baseCurrency of uniqueBases) {
      const rates = await this.getRates(baseCurrency);
      
      if (!rates) continue;
      
      // Apply conversions for this base
      for (const conv of conversions) {
        if (conv.fromCurrency !== baseCurrency) continue;
        
        const key = `${conv.fromCurrency}-${conv.toCurrency}`;
        
        if (conv.fromCurrency === conv.toCurrency) {
          results.set(key, conv.amount);
        } else {
          const rate = rates[conv.toCurrency];
          if (rate) {
            // Local multiplication - no API call!
            results.set(key, conv.amount * rate);
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Convert entire price map to target currency
   * Optimized for batch operations
   */
  async convertPriceMap(
    prices: Map<string, { price: number; currency: string }>,
    targetCurrency: string
  ): Promise<Map<string, number>> {
    const converted = new Map<string, number>();
    
    // Group prices by source currency
    const byCurrency = new Map<string, Array<{ symbol: string; price: number }>>();
    
    for (const [symbol, data] of prices) {
      if (!byCurrency.has(data.currency)) {
        byCurrency.set(data.currency, []);
      }
      byCurrency.get(data.currency)!.push({ symbol, price: data.price });
    }
    
    // Convert each currency group
    for (const [sourceCurrency, items] of byCurrency) {
      if (sourceCurrency === targetCurrency) {
        // No conversion needed
        for (const item of items) {
          converted.set(item.symbol, item.price);
        }
      } else {
        // Get rate once for this currency
        const rate = await this.getRate(sourceCurrency, targetCurrency);
        
        if (rate) {
          // Apply same rate to all items
          for (const item of items) {
            converted.set(item.symbol, item.price * rate);
          }
        } else {
          console.warn(`Failed to convert ${sourceCurrency} → ${targetCurrency}`);
          // Keep original prices
          for (const item of items) {
            converted.set(item.symbol, item.price);
          }
        }
      }
    }
    
    return converted;
  }
  
  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    if (!this.ratesCache) return false;
    return Date.now() - this.ratesCache.timestamp < this.cacheTTL;
  }
  
  /**
   * Get cache info for debugging
   */
  getCacheInfo(): {
    hasCache: boolean;
    base: string | null;
    age: number | null;
    ttl: number;
    expiresIn: number | null;
  } {
    if (!this.ratesCache) {
      return {
        hasCache: false,
        base: null,
        age: null,
        ttl: this.cacheTTL,
        expiresIn: null,
      };
    }
    
    const age = Date.now() - this.ratesCache.timestamp;
    const expiresIn = this.cacheTTL - age;
    
    return {
      hasCache: true,
      base: this.ratesCache.base,
      age,
      ttl: this.cacheTTL,
      expiresIn: Math.max(0, expiresIn),
    };
  }
  
  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.ratesCache = null;
  }
  
  /**
   * Force refresh rates (bypass cache)
   */
  async forceRefresh(baseCurrency: string = 'USD'): Promise<ExchangeRates | null> {
    this.clearCache();
    return this.getRates(baseCurrency);
  }
}

// Export singleton with 2-hour cache
export const exchangeRateProvider = new ExchangeRateProvider(2 * 60 * 60 * 1000);
