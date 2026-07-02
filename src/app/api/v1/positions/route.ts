import { NextRequest, NextResponse } from 'next/server';
import { getApiKeyPerson } from '@/lib/api/api-key-auth';
import { handleApiError } from '@/lib/api/handle-error';
import { priceService } from '@/lib/api/price-service';
import { holdingRepository } from '@/lib/db/repositories';
import type { AssetType } from '@/types';

type Position = {
  ticker: string;
  name: string;
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
};

/**
 * External read-only API. Authenticated with the per-person API key set in
 * the person edit dialog (`Authorization: Bearer <key>`), not the Supabase
 * session. Returns only the positions of the person the key belongs to.
 */
export async function GET(request: NextRequest) {
  try {
    const person = await getApiKeyPerson(request);
    const holdings = await holdingRepository.findByPersonId(person.userId, person.id);

    // Live prices (5-min server cache in priceService); stored holding price
    // is the fallback when a provider fails for a symbol. avgPrice is stored
    // in the holding's currency, so live prices must be converted to the same
    // currency or USD assets (crypto, futures) come back unusable next to EUR
    // cost bases. One batch call per distinct holding currency.
    const byCurrency = new Map<string, { symbol: string; assetType: AssetType }[]>();
    for (const h of holdings) {
      const group = byCurrency.get(h.currency) ?? [];
      group.push({ symbol: h.assetSymbol, assetType: h.assetType as AssetType });
      byCurrency.set(h.currency, group);
    }
    const priceBatches = await Promise.all(
      Array.from(byCurrency, ([currency, assets]) =>
        priceService.batchGetPrices(assets, currency)
      )
    );
    const livePrices = new Map(priceBatches.flatMap((batch) => [...batch]));

    const positions: Position[] = holdings.map((h) => ({
      ticker: h.assetSymbol,
      name: h.assetName,
      type: h.assetType.toLowerCase(),
      quantity: Number(h.quantity),
      avgPrice: Number(h.averagePrice),
      currentPrice:
        livePrices.get(h.assetSymbol)?.price ??
        (h.currentPrice !== null ? Number(h.currentPrice) : null),
    }));

    return NextResponse.json({ positions });
  } catch (error) {
    return handleApiError(error, 'GET /api/v1/positions');
  }
}
