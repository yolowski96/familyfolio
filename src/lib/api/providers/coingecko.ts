import { PriceData } from '@/types';
import { COINGECKO_API_KEY } from '@/lib/env';

interface SearchResult {
  symbol: string;
  name: string;
  id: string;
}

interface CoinInfo {
  id: string;
  symbol: string;
  name: string;
  description?: string;
  marketCap?: number;
  totalVolume?: number;
  circulatingSupply?: number;
  maxSupply?: number;
  athPrice?: number;
  atlPrice?: number;
}

interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
    eur?: number;
    usd_24h_change?: number;
  };
}

interface CoinGeckoSearchResponse {
  coins?: Array<{
    id: string;
    name: string;
    symbol: string;
    market_cap_rank?: number;
  }>;
}

interface CoinGeckoCoinResponse {
  id: string;
  symbol: string;
  name: string;
  description?: {
    en?: string;
  };
  market_data?: {
    market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    circulating_supply?: number;
    max_supply?: number;
    ath?: { usd?: number };
    atl?: { usd?: number };
  };
}

export class CoinGeckoProvider {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Map common crypto symbols to CoinGecko coin IDs
   */
  private symbolToId(symbol: string): string {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'AVAX': 'avalanche-2',
      'ATOM': 'cosmos',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
      'NEAR': 'near',
      'APT': 'aptos',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'SHIB': 'shiba-inu',
      'TRX': 'tron',
      'WBTC': 'wrapped-bitcoin',
      'DAI': 'dai',
      'TON': 'the-open-network',
      'XLM': 'stellar',
      'ALGO': 'algorand',
      'FIL': 'filecoin',
      'HBAR': 'hedera-hashgraph',
    };

    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers['x-cg-demo-api-key'] = this.apiKey;
    }
    return headers;
  }

  /**
   * Fetch current price for a single cryptocurrency
   */
  async fetchPrice(symbol: string): Promise<PriceData | null> {
    try {
      const coinId = this.symbolToId(symbol);

      const params = new URLSearchParams({
        ids: coinId,
        vs_currencies: 'usd,eur',
        include_24hr_change: 'true',
      });

      const url = `${this.baseUrl}/simple/price?${params}`;

      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`CoinGecko error for ${symbol}: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: CoinGeckoPriceResponse = await response.json();

      const coinData = data[coinId];
      if (!coinData) {
        console.error(`No data for ${symbol} (${coinId})`);
        return null;
      }

      // Calculate absolute change from percentage
      const changePercent = coinData.usd_24h_change || 0;
      const change24h = coinData.usd * (changePercent / 100);

      return {
        symbol: symbol.toUpperCase(),
        shortName: symbol.toUpperCase(), // CoinGecko doesn't provide short name in simple/price
        price: coinData.usd,
        currency: 'USD',
        change24h: change24h,
        changePercent24h: changePercent,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Error fetching ${symbol} from CoinGecko:`, error);
      return null;
    }
  }

  /**
   * Fetch prices for multiple cryptocurrencies in one request
   */
  async batchFetch(symbols: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    if (symbols.length === 0) return results;

    try {
      // Convert symbols to coin IDs
      const symbolToIdMap = new Map<string, string>();
      const coinIds: string[] = [];

      for (const symbol of symbols) {
        const coinId = this.symbolToId(symbol);
        symbolToIdMap.set(coinId, symbol);
        coinIds.push(coinId);
      }

      const params = new URLSearchParams({
        ids: coinIds.join(','),
        vs_currencies: 'usd,eur',
        include_24hr_change: 'true',
      });

      const url = `${this.baseUrl}/simple/price?${params}`;

      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`CoinGecko batch error: ${response.status} ${response.statusText}`);
        return results;
      }

      const data: CoinGeckoPriceResponse = await response.json();

      // Map back to original symbols
      for (const symbol of symbols) {
        const coinId = this.symbolToId(symbol);
        const coinData = data[coinId];

        if (coinData) {
          const changePercent = coinData.usd_24h_change || 0;
          const change24h = coinData.usd * (changePercent / 100);

          results.set(symbol, {
            symbol: symbol.toUpperCase(),
            shortName: symbol.toUpperCase(),
            price: coinData.usd,
            currency: 'USD',
            change24h: change24h,
            changePercent24h: changePercent,
            lastUpdated: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('CoinGecko batch fetch error:', error);
    }

    return results;
  }

  /**
   * Search for cryptocurrencies by name or symbol
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`CoinGecko search error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: CoinGeckoSearchResponse = await response.json();

      return (data.coins || []).slice(0, 10).map((coin) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        id: coin.id,
      }));
    } catch (error) {
      console.error('CoinGecko search error:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a cryptocurrency
   */
  async getCoinInfo(symbol: string): Promise<CoinInfo | null> {
    try {
      const coinId = this.symbolToId(symbol);

      const url = `${this.baseUrl}/coins/${coinId}`;

      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error(`CoinGecko info error for ${symbol}: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: CoinGeckoCoinResponse = await response.json();

      return {
        id: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        description: data.description?.en,
        marketCap: data.market_data?.market_cap?.usd,
        totalVolume: data.market_data?.total_volume?.usd,
        circulatingSupply: data.market_data?.circulating_supply,
        maxSupply: data.market_data?.max_supply,
        athPrice: data.market_data?.ath?.usd,
        atlPrice: data.market_data?.atl?.usd,
      };
    } catch (error) {
      console.error('CoinGecko getCoinInfo error:', error);
      return null;
    }
  }
}

export const coinGeckoProvider = new CoinGeckoProvider(COINGECKO_API_KEY);

