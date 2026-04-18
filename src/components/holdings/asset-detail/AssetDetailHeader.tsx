'use client';

import { Badge } from '@/components/ui/badge';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AssetTypeIcon, TYPE_COLORS } from '@/lib/assetTypeDisplay';
import { AssetHolding } from '@/types';

export function AssetDetailHeader({ asset }: { asset: AssetHolding }) {
  return (
    <SheetHeader className="pb-4">
      <div className="flex items-center gap-4">
        <div
          className={`flex size-14 items-center justify-center rounded-xl ${TYPE_COLORS[asset.type]}`}
        >
          <AssetTypeIcon type={asset.type} size="lg" />
        </div>
        <div className="flex-1">
          <SheetTitle className="text-xl">{asset.symbol}</SheetTitle>
          <SheetDescription>{asset.name}</SheetDescription>
        </div>
        <Badge variant="outline" className={TYPE_COLORS[asset.type]}>
          {asset.type}
        </Badge>
      </div>
    </SheetHeader>
  );
}
