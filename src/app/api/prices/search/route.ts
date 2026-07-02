import { NextRequest, NextResponse } from 'next/server';
import { priceService } from '@/lib/api/price-service';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api/handle-error';
import { parseJsonBody } from '@/lib/api-utils';
import { AssetType } from '@/types';

interface SearchBody {
  query: string;
  assetType?: AssetType;
}

export async function POST(request: NextRequest) {
  try {
    await getAuthUser();
    const parsed = await parseJsonBody<SearchBody>(request);
    if (parsed.error) return parsed.error;
    const { query, assetType } = parsed.data;

    if (!query || query.length < 1) {
      return NextResponse.json(
        { error: 'Query must be at least 1 character' },
        { status: 400 }
      );
    }

    const results = await priceService.search(query, assetType);
    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error, 'POST /api/prices/search');
  }
}
