import { NextRequest, NextResponse } from 'next/server';
import { priceService } from '@/lib/api/price-service';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';
import { AssetType } from '@/types';

interface BatchAsset {
  symbol: string;
  assetType: AssetType;
  exchange?: string;
}

interface BatchPricesBody {
  assets: BatchAsset[];
  convertTo?: string;
}

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const { searchParams } = new URL(request.url);

    const convertTo = searchParams.get('convertTo') || undefined;
    const symbol = searchParams.get('symbol');
    const assetType = searchParams.get('type') as AssetType | null;
    const exchange = searchParams.get('exchange') || undefined;

    if (!symbol || !assetType) {
      return NextResponse.json(
        { error: 'Missing required parameters: symbol and type' },
        { status: 400 }
      );
    }

    const price = await priceService.getPrice(symbol, assetType, exchange, convertTo);

    if (!price) {
      return NextResponse.json(
        { error: 'Price not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(price);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/prices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthUser();
    const parsed = await parseJsonBody<BatchPricesBody>(request);
    if (parsed.error) return parsed.error;
    const { assets, convertTo } = parsed.data;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'assets array is required and must not be empty' },
        { status: 400 }
      );
    }

    const prices = await priceService.batchGetPrices(assets, convertTo || undefined);
    return NextResponse.json(Object.fromEntries(prices));
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('POST /api/prices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
