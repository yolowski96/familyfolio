'use client';

import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { formatCurrency } from '@/lib/utils';
import { AssetTypeIcon, TYPE_COLORS } from '@/lib/assetTypeDisplay';
import { SummaryStatCard } from '@/components/shared/SummaryStatCard';

interface HoldingsSummaryStatsProps {
  cryptoCount: number;
  stockCount: number;
  etfCount: number;
  totalPL: number;
}

export function HoldingsSummaryStats({
  cryptoCount,
  stockCount,
  etfCount,
  totalPL,
}: HoldingsSummaryStatsProps) {
  usePrivacy();
  const plPositive = totalPL >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryStatCard
        label="Crypto"
        value={`${cryptoCount} assets`}
        icon={<AssetTypeIcon type="CRYPTO" size="lg" />}
        iconClassName={TYPE_COLORS.CRYPTO}
      />
      <SummaryStatCard
        label="Stocks"
        value={`${stockCount} assets`}
        icon={<AssetTypeIcon type="STOCK" size="lg" />}
        iconClassName={TYPE_COLORS.STOCK}
      />
      <SummaryStatCard
        label="ETFs"
        value={`${etfCount} assets`}
        icon={<AssetTypeIcon type="ETF" size="lg" />}
        iconClassName={TYPE_COLORS.ETF}
      />
      <SummaryStatCard
        label="Total P/L"
        value={formatCurrency(totalPL)}
        icon={
          plPositive ? (
            <IconTrendingUp className="size-6" />
          ) : (
            <IconTrendingDown className="size-6" />
          )
        }
        iconClassName={
          plPositive
            ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-rose-500/10 text-rose-500'
        }
        valueClassName={plPositive ? 'text-emerald-500' : 'text-rose-500'}
      />
    </div>
  );
}
