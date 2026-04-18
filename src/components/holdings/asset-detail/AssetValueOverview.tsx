'use client';

import {
  IconArrowDown,
  IconArrowUp,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { AssetHolding } from '@/types';

export function AssetValueOverview({ asset }: { asset: AssetHolding }) {
  const isPositive = asset.unrealizedPL >= 0;
  const is24hPositive = asset.change24hPercent >= 0;

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Value</p>
              <p className="text-3xl font-bold">{formatCurrency(asset.totalValue)}</p>
            </div>
            <div
              className={`flex items-center gap-1 text-lg font-medium ${is24hPositive ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {is24hPositive ? (
                <IconArrowUp className="size-5" />
              ) : (
                <IconArrowDown className="size-5" />
              )}
              {formatPercent(asset.change24hPercent)}
              <span className="text-xs text-muted-foreground ml-1">24h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <SmallStat label="Current Price" value={formatCurrency(asset.currentPrice)} />
        <SmallStat label="Avg. Buy Price" value={formatCurrency(asset.avgBuyPrice)} />
        <SmallStat label="Quantity Held" value={formatQuantity(asset.totalQuantity)} />
        <SmallStat
          label="Allocation"
          value={`${asset.allocationPercent.toFixed(1)}%`}
        />
      </div>

      <Card
        className={
          isPositive
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-rose-500/30 bg-rose-500/5'
        }
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Unrealized Profit/Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}
            >
              {isPositive ? (
                <IconTrendingUp className="size-6" />
              ) : (
                <IconTrendingDown className="size-6" />
              )}
              <span className="text-2xl font-bold">
                {formatCurrency(asset.unrealizedPL)}
              </span>
            </div>
            <Badge
              variant="outline"
              className={
                isPositive
                  ? 'border-emerald-500/30 text-emerald-500'
                  : 'border-rose-500/30 text-rose-500'
              }
            >
              {formatPercent(asset.unrealizedPLPercent)}
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cost Basis</p>
              <p className="font-medium">{formatCurrency(asset.costBasis)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Market Value</p>
              <p className="font-medium">{formatCurrency(asset.totalValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
