import { AssetType } from './index';

export interface AssetSearchResult {
  symbol: string;
  name: string;
  type: string;
  assetType?: AssetType;
  exchange?: string;
  id?: string;
  quantity?: number;
}
