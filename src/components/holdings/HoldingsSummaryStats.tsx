'use client';

import {
  IconCurrencyBitcoin,
  IconCurrencyEuro,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react';
import { usePrivacy } from '@/components/providers/PrivacyProvider';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TYPE_COLORS } from './HoldingCard';

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
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_COLORS.CRYPTO}`}>
            <IconCurrencyBitcoin className="size-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Crypto</p>
            <p className="text-xl font-semibold">{cryptoCount} assets</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_COLORS.STOCK}`}>
            <IconCurrencyEuro className="size-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Stocks</p>
            <p className="text-xl font-semibold">{stockCount} assets</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className={`flex size-12 items-center justify-center rounded-lg ${TYPE_COLORS.ETF}`}>
            <IconTrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">ETFs</p>
            <p className="text-xl font-semibold">{etfCount} assets</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 pt-0">
          <div className={`flex size-12 items-center justify-center rounded-lg ${totalPL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {totalPL >= 0 ? <IconTrendingUp className="size-6" /> : <IconTrendingDown className="size-6" />}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Total P/L</p>
            <p className={`text-xl font-semibold ${totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(totalPL)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
