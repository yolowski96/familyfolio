'use client';

import { IconExternalLink } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { AssetType } from '@/types';

export interface AssetTransactionStats {
  buyCount: number;
  sellCount: number;
  totalBought: number;
  totalSold: number;
}

interface AssetStatsTabProps {
  type: AssetType;
  stats: AssetTransactionStats;
}

export function AssetStatsTab({ type, stats }: AssetStatsTabProps) {
  return (
    <>
      <Card>
        <CardContent className="pt-4 space-y-4">
          <StatRow label="Buy Orders" value={stats.buyCount} />
          <Separator />
          <StatRow label="Sell Orders" value={stats.sellCount} />
          <Separator />
          <StatRow
            label="Total Bought"
            value={formatCurrency(stats.totalBought)}
            valueClassName="text-emerald-500"
          />
          <Separator />
          <StatRow
            label="Total Sold"
            value={formatCurrency(stats.totalSold)}
            valueClassName="text-rose-500"
          />
          <Separator />
          <StatRow
            label="Net Investment"
            value={formatCurrency(stats.totalBought - stats.totalSold)}
          />
        </CardContent>
      </Card>

      {type === 'CRYPTO' && (
        <Button variant="outline" className="w-full gap-2">
          <IconExternalLink className="size-4" />
          View on CoinGecko
        </Button>
      )}
      {type === 'STOCK' && (
        <Button variant="outline" className="w-full gap-2">
          <IconExternalLink className="size-4" />
          View on Yahoo Finance
        </Button>
      )}
    </>
  );
}

function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={`font-medium ${valueClassName ?? ''}`}>{value}</span>
    </div>
  );
}
