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
  private readonly baseUrl = 'https://query1.finance.yahoo.com/v8/finance';
  private readonly searchUrl = 'https://query2.finance.yahoo.com/v1/finance/search';
  private readonly userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

  /**
   * Fetch current price for a single stock or ETF
   */
  async fetchPrice(symbol: string, exchange?: string): Promise<PriceData | null> {
    try {
      const formattedSymbol = this.formatSymbol(symbol, exchange);
      const url = `${this.baseUrl}/chart/${formattedSymbol}?interval=1d&range=1d`;

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
   * Fetch prices for multiple symbols with rate limiting
   */
  async batchFetch(
    symbols: Array<{ symbol: string; exchange?: string }>
  ): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    const BATCH_SIZE = 5;
    const DELAY_MS = 200;

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);

      // Fetch batch in parallel
      const promises = batch.map(({ symbol, exchange }) =>
        this.fetchPrice(symbol, exchange).then((data) => ({ symbol, data }))
      );

      const batchResults = await Promise.all(promises);

      // Add successful results to map
      for (const { symbol, data } of batchResults) {
        if (data) {
          results.set(symbol, data);
        }
      }

      // Delay between batches (except last batch)
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
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

