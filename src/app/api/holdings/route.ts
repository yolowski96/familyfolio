import { NextRequest, NextResponse } from 'next/server';
import { holdingRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';
import { validatePersonOwnership } from '@/lib/api/validate-person';
import { priceService } from '@/lib/api/price-service';
import type { AssetType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');
    const include = searchParams.get('include');

    let holdings;
    if (personId) {
      holdings = await holdingRepository.findByPersonId(user.id, personId);
    } else if (include === 'relations') {
      holdings = await holdingRepository.findAll(user.id);
    } else {
      holdings = await holdingRepository.findAllLean(user.id);
    }

    return NextResponse.json(holdings);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/holdings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'update-prices') {
      const uniqueAssets = await holdingRepository.getUniqueAssets(user.id);

      if (uniqueAssets.length === 0) {
        return NextResponse.json({ success: true, updated: 0, message: 'No holdings to update' });
      }

      const assets = uniqueAssets.map((h) => ({
        symbol: h.symbol,
        assetType: h.type as AssetType,
      }));

      const priceData = await priceService.batchGetPrices(assets);
      const prices = new Map<string, number>();
      for (const [symbol, data] of priceData) {
        prices.set(symbol, data.price);
      }

      const updatedCount = await holdingRepository.updatePrices(user.id, prices);
      return NextResponse.json({
        success: true,
        updated: updatedCount,
        message: `Updated prices for ${updatedCount} holdings`,
      });
    }

    if (action === 'recalculate') {
      const parsed = await parseJsonBody(request);
      if (parsed.error) return parsed.error;
      const { personId } = parsed.data as Record<string, unknown>;

      if (!personId) {
        return NextResponse.json({ error: 'personId is required for recalculation' }, { status: 400 });
      }

      const personError = await validatePersonOwnership(personId as string, user.id);
      if (personError) return personError;

      await holdingRepository.recalculateFromTransactions(user.id, personId as string);
      return NextResponse.json({ success: true, message: 'Holdings recalculated successfully' });
    }

    if (action === 'recalculate-all') {
      await holdingRepository.recalculateAll(user.id);
      return NextResponse.json({ success: true, message: 'All holdings recalculated successfully' });
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: update-prices, recalculate, recalculate-all' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('POST /api/holdings error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process holdings action' },
      { status: 500 }
    );
  }
}
