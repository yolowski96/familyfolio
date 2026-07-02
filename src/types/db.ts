import type { AssetType } from '@/types';

export interface DbPerson {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  /** Masked preview of the external API key (first chars); full key is never returned. */
  apiKeyPrefix: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbTransaction {
  id: string;
  personId: string;
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  type: 'BUY' | 'SELL';
  quantity: number | string;
  pricePerUnit: number | string;
  totalAmount: number | string;
  currency: string;
  fee: number | string;
  date: string;
  exchange?: string;
  notes?: string;
  person?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface DbHolding {
  id: string;
  personId: string;
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  quantity: number | string;
  averagePrice: number | string;
  totalInvested: number | string;
  currentPrice?: number | string | null;
  currentValue?: number | string | null;
  profitLoss?: number | string | null;
  profitLossPercent?: number | string | null;
  currency: string;
  lastPriceUpdate?: string | null;
  person?: {
    id: string;
    name: string;
    color: string;
  };
  asset?: {
    symbol: string;
    name: string;
    type: AssetType;
  };
}
