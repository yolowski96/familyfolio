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
  private readonly chartUrl = 'https://query1.finance.yahoo.com/v8/finance';
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
        // Let Next.js's data cache dedupe identical requests across a short
        // window. Combined with the in-memory `PriceService` cache this mostly
        // helps across dev server restarts and serverless cold starts.
        next: { revalidate: 300 },
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
   * Fetch prices for multiple symbols in parallel using the per-symbol chart
   * endpoint.
   *
   * Historically this tried the v7 `/finance/quote` batch endpoint first and
   * fell back to individual chart calls only on failure. That batch endpoint
   * now always returns 401 for anonymous requests (Yahoo requires a `crumb`
   * cookie flow), so the "try batch first" path was pure latency waste on
   * every call. We go straight to parallel per-symbol chart requests, which
   * do work without auth.
   */
  async batchFetch(
    symbols: Array<{ symbol: string; exchange?: string }>
  ): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    if (symbols.length === 0) return results;

    const fetchPromises = symbols.map((s) =>
      this.fetchPrice(s.symbol, s.exchange).then((data) => ({
        symbol: s.symbol,
        data,
      }))
    );

    const fetched = await Promise.all(fetchPromises);
    for (const { symbol, data } of fetched) {
      if (data) {
        results.set(symbol, data);
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
        next: { revalidate: 3600 },
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

