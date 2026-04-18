'use client';

import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { AssetTypeIcon, TYPE_COLORS } from '@/lib/assetTypeDisplay';
import { AssetHolding } from '@/types';

interface HoldingCardProps {
  holding: AssetHolding;
  onClick: () => void;
}

export function HoldingCard({ holding, onClick }: HoldingCardProps) {
  usePrivacy();
  const isPositive = holding.unrealizedPL >= 0;
  const is24hPositive = holding.change24hPercent >= 0;

  return (
    <Card
      className="cursor-pointer transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${TYPE_COLORS[holding.type]}`}>
              <AssetTypeIcon type={holding.type} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{holding.symbol}</CardTitle>
              <p className="text-muted-foreground text-sm line-clamp-2 min-h-[2.5rem]">{holding.name}</p>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${TYPE_COLORS[holding.type]}`}>
            {holding.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold">{formatCurrency(holding.totalValue)}</span>
          <div className={`flex items-center gap-1 text-sm ${is24hPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {is24hPositive ? <IconArrowUp className="size-4" /> : <IconArrowDown className="size-4" />}
            {formatPercent(holding.change24hPercent)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
          <div>
            <p className="text-muted-foreground text-xs">Quantity</p>
            <p className="font-medium">{formatQuantity(holding.totalQuantity)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Avg. Cost</p>
            <p className="font-medium">{formatCurrency(holding.avgBuyPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Current Price</p>
            <p className="font-medium">{formatCurrency(holding.currentPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">P/L</p>
            <p className={`font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(holding.unrealizedPL)} ({formatPercent(holding.unrealizedPLPercent)})
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-muted-foreground text-xs">Portfolio Allocation</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(holding.allocationPercent, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{holding.allocationPercent.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
