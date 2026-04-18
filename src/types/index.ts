export type AssetType = 'STOCK' | 'CRYPTO' | 'ETF';

export interface PriceData {
  symbol: string;
  shortName: string;
  price: number;
  currency: string;
  change24h?: number;
  changePercent24h?: number;
  chartPreviousClose?: number;
  lastUpdated: Date;
  // Optional: Store original values before currency conversion
  originalPrice?: number;
  originalCurrency?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  type: 'BUY' | 'SELL';
  quantity: number;
  pricePerUnit: number;
  date: string;
}

export interface AssetHolding {
  symbol: string;
  name: string;
  type: AssetType;
  totalQuantity: number;
  avgBuyPrice: number;
  costBasis: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  allocationPercent: number;
  change24h: number;
  change24hPercent: number;
}

export interface PortfolioSummary {
  totalBalance: number;
  totalPL: number;
  totalPLPercent: number;
  topPerformer: AssetHolding | null;
  holdings: AssetHolding[];
  allocationByType: {
    type: AssetType;
    value: number;
    percent: number;
  }[];
}
