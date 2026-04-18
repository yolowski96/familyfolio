import {
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconTrendingUp,
} from '@tabler/icons-react';
import { AssetType } from '@/types';

/**
 * Tailwind class tokens shared between the holdings grid, holdings table,
 * transactions table, asset detail sheet, and analytics.
 */
export const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  STOCK: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  ETF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

/**
 * Hex colors for chart fills (recharts does not accept tailwind classes).
 */
export const TYPE_CHART_COLORS: Record<AssetType, string> = {
  CRYPTO: '#06b6d4',
  STOCK: '#8b5cf6',
  ETF: '#f59e0b',
};

export type AssetIconSize = 'sm' | 'md' | 'lg';

const ICON_SIZE_CLASS: Record<AssetIconSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

export function AssetTypeIcon({
  type,
  size = 'md',
}: {
  type: AssetType;
  size?: AssetIconSize;
}) {
  const className = ICON_SIZE_CLASS[size];
  switch (type) {
    case 'CRYPTO':
      return <IconCurrencyBitcoin className={className} />;
    case 'ETF':
      return <IconTrendingUp className={className} />;
    case 'STOCK':
    default:
      return <IconCurrencyEuro className={className} />;
  }
}
