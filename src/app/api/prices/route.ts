import { NextRequest, NextResponse } from 'next/server';
import { priceService } from '@/lib/api/price-service';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import { AssetType } from '@/types';

interface BatchAsset {
  symbol: string;
  assetType: AssetType;
  exchange?: string;
}

interface SearchBody {
  query: string;
  assetType?: AssetType;
}

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const { searchParams } = new URL(request.url);

    // Optional currency conversion target
    const convertTo = searchParams.get('convertTo') || undefined;

    // Single asset query
    const symbol = searchParams.get('symbol');
    const assetType = searchParams.get('type') as AssetType | null;
    const exchange = searchParams.get('exchange') || undefined;

    if (symbol && assetType) {
      const price = await priceService.getPrice(symbol, assetType, exchange, convertTo);

      if (!price) {
        return NextResponse.json(
          { error: 'Price not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(price);
    }

    // Batch query
    const assetsParam = searchParams.get('assets');

    if (assetsParam) {
      try {
        const assets: BatchAsset[] = JSON.parse(assetsParam);

        if (!Array.isArray(assets)) {
          return NextResponse.json(
            { error: 'Assets must be an array' },
            { status: 400 }
          );
        }

        const prices = await priceService.batchGetPrices(assets, convertTo);

        // Convert Map to Object for JSON serialization
        const pricesObj = Object.fromEntries(prices);

        return NextResponse.json(pricesObj);
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid JSON in assets parameter' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Missing required parameters (symbol+type OR assets)' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthUser();
    const body: SearchBody = await request.json();
    const { query, assetType } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query required' },
        { status: 400 }
      );
    }

    if (query.length < 1) {
      return NextResponse.json(
        { error: 'Query must be at least 1 character' },
        { status: 400 }
      );
    }

    const results = await priceService.search(query, assetType);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

