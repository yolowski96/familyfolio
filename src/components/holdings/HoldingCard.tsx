'use client';

import {
  IconArrowDown,
  IconArrowUp,
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconTrendingUp,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatQuantity } from '@/lib/utils';
import { AssetHolding, AssetType } from '@/types';

export const TYPE_COLORS: Record<AssetType, string> = {
  CRYPTO: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  STOCK: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  ETF: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export const TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  CRYPTO: <IconCurrencyBitcoin className="size-5" />,
  STOCK: <IconCurrencyEuro className="size-5" />,
  ETF: <IconTrendingUp className="size-5" />,
};

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

interface HoldingCardProps {
  holding: AssetHolding;
  onClick: () => void;
}

export function HoldingCard({ holding, onClick }: HoldingCardProps) {
  const isPositive = holding.unrealizedPL >= 0;
  const is24hPositive = holding.change24hPercent >= 0;

  return (
    <Card
      className="cursor-pointer transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-lg ${TYPE_COLORS[holding.type]}`}>
              {TYPE_ICONS[holding.type]}
            </div>
            <div>
              <CardTitle className="text-base">{holding.symbol}</CardTitle>
              <p className="text-muted-foreground text-sm">{holding.name}</p>
            </div>
          </div>
          <Badge variant="outline" className={TYPE_COLORS[holding.type]}>
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
