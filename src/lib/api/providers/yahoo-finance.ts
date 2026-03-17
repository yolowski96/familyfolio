import { PriceData } from '@/types';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta: {
        regularMarketPrice: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
        symbol: string;
        shortName?: string;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: Array<{
      symbol: string;
      shortName?: string;
      regularMarketPrice?: number;
      regularMarketPreviousClose?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      currency?: string;
    }>;
    error?: unknown;
  };
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol: string;
    longname?: string;
    shortname?: string;
    quoteType?: string;
    exchange?: string;
  }>;
}

export class YahooFinanceProvider {
  private readonly chartUrl = 'https://query1.finance.yahoo.com/v8/finance';
  private readonly quoteUrl = 'https://query1.finance.yahoo.com/v7/finance/quote';
  private readonly searchUrl = 'https://query2.finance.yahoo.com/v1/finance/search';
  private readonly userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  /**
   * Fetch current price for a single stock or ETF
   */
  async fetchPrice(symbol: string, exchange?: string): Promise<PriceData | null> {
    try {
      const formattedSymbol = this.formatSymbol(symbol, exchange);
      const url = `${this.chartUrl}/chart/${formattedSymbol}?interval=1d&range=1d`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        console.error(`Yahoo Finance API error for ${symbol}: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: YahooChartResponse = await response.json();

      const result = data.chart?.result?.[0];
      if (!result) {
        console.error(`No data returned for ${symbol}`);
        return null;
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      // Yahoo API returns chartPreviousClose for the previous trading day's close
      const previousClose = meta.chartPreviousClose ?? meta.previousClose;
      const currency = meta.currency || 'USD';
      const shortName = meta.shortName || symbol;

      // Calculate 24h changes
      const change = previousClose ? currentPrice - previousClose : 0;
      const changePercent = previousClose && previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: symbol,
        shortName: shortName,
        price: currentPrice,
        currency: currency,
        change24h: change,
        changePercent24h: changePercent,
        chartPreviousClose: previousClose,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Error fetching ${symbol} from Yahoo:`, error);
      return null;
    }
  }

  /**
   * Fetch prices for multiple symbols using Yahoo's v7 quote endpoint.
   * Sends a single HTTP request for up to 50 symbols at once.
   * Falls back to individual chart requests for any symbols that fail.
   */
  async batchFetch(
    symbols: Array<{ symbol: string; exchange?: string }>
  ): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    if (symbols.length === 0) return results;

    const symbolMap = new Map(
      symbols.map((s) => [this.formatSymbol(s.symbol, s.exchange), s.symbol])
    );
    const formattedSymbols = Array.from(symbolMap.keys());

    const BATCH_SIZE = 50;

    for (let i = 0; i < formattedSymbols.length; i += BATCH_SIZE) {
      const batch = formattedSymbols.slice(i, i + BATCH_SIZE);
      const joined = batch.join(',');

      try {
        const url = `${this.quoteUrl}?symbols=${encodeURIComponent(joined)}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChange,regularMarketChangePercent,currency,shortName`;
        const response = await fetch(url, {
          headers: { 'User-Agent': this.userAgent },
        });

        if (!response.ok) {
          throw new Error(`Quote API returned ${response.status}`);
        }

        const data: YahooQuoteResponse = await response.json();
        const quotes = data.quoteResponse?.result ?? [];

        for (const quote of quotes) {
          if (!quote.symbol || quote.regularMarketPrice == null) continue;

          const originalSymbol = symbolMap.get(quote.symbol) ?? quote.symbol;
          const previousClose = quote.regularMarketPreviousClose;
          const change = quote.regularMarketChange ?? (previousClose ? quote.regularMarketPrice - previousClose : 0);
          const changePercent = quote.regularMarketChangePercent ?? (previousClose && previousClose > 0 ? (change / previousClose) * 100 : 0);

          results.set(originalSymbol, {
            symbol: originalSymbol,
            shortName: quote.shortName || originalSymbol,
            price: quote.regularMarketPrice,
            currency: quote.currency || 'USD',
            change24h: change,
            changePercent24h: changePercent,
            chartPreviousClose: previousClose,
            lastUpdated: new Date(),
          });
        }
      } catch (error) {
        console.error('Yahoo batch quote failed, falling back to individual requests:', error);
      }

      // Fall back to individual chart requests for any missing symbols
      const missingSymbols = batch.filter(
        (fs) => !results.has(symbolMap.get(fs) ?? fs)
      );

      if (missingSymbols.length > 0) {
        const fallbackPromises = missingSymbols.map((fs) => {
          const original = symbolMap.get(fs) ?? fs;
          const entry = symbols.find((s) => s.symbol === original);
          return this.fetchPrice(original, entry?.exchange).then((data) => ({
            symbol: original,
            data,
          }));
        });

        const fallbackResults = await Promise.all(fallbackPromises);
        for (const { symbol, data } of fallbackResults) {
          if (data) {
            results.set(symbol, data);
          }
        }
      }
    }

    return results;
  }

  /**
   * Search for stock/ETF symbols by name or ticker
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      const url = `${this.searchUrl}?q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        console.error(`Yahoo Finance search error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: YahooSearchResponse = await response.json();

      return (data.quotes || []).slice(0, 10).map((quote) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        type: quote.quoteType || 'UNKNOWN',
        exchange: quote.exchange,
      }));
    } catch (error) {
      console.error('Yahoo Finance search error:', error);
      return [];
    }
  }

  /**
   * Add exchange suffix to symbol for international stocks/ETFs
   */
  private formatSymbol(symbol: string, exchange?: string): string {
    if (!exchange) return symbol;

    const exchangeSuffixes: Record<string, string> = {
      'XETRA': '.DE',           // Germany
      'LSE': '.L',              // London Stock Exchange
      'EURONEXT_PAR': '.PA',    // Euronext Paris
      'EURONEXT_AMS': '.AS',    // Euronext Amsterdam
      'SIX': '.SW',             // Swiss Exchange
      'BME': '.MC',             // Madrid (Spain)
      'BORSA': '.MI',           // Milan (Italy)
      'TSX': '.TO',             // Toronto
      'ASX': '.AX',             // Australia
      'HKEX': '.HK',            // Hong Kong
      'TSE': '.T',              // Tokyo
      'NYSE': '',               // New York - no suffix
      'NASDAQ': '',             // NASDAQ - no suffix
    };

    const suffix = exchangeSuffixes[exchange.toUpperCase()] || '';
    return `${symbol}${suffix}`;
  }
}

// Export singleton instance
export const yahooFinanceProvider = new YahooFinanceProvider();

