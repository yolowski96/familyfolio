import { NextRequest, NextResponse } from 'next/server';
import { exchangeRateProvider } from '@/lib/api/providers/exchange-rate';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api/handle-error';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const { searchParams } = new URL(request.url);

    const action = searchParams.get('action');

    // Get cache info
    if (action === 'info') {
      const info = exchangeRateProvider.getCacheInfo();
      return NextResponse.json(info);
    }

    // Force refresh
    if (action === 'refresh') {
      const base = searchParams.get('base') || 'USD';
      const rates = await exchangeRateProvider.forceRefresh(base);

      return NextResponse.json({
        success: !!rates,
        base,
        ratesCount: rates ? Object.keys(rates).length : 0,
        cacheInfo: exchangeRateProvider.getCacheInfo(),
      });
    }

    // Get specific rate
    const from = searchParams.get('from') || 'USD';
    const to = searchParams.get('to') || 'EUR';

    const rate = await exchangeRateProvider.getRate(from, to);

    if (!rate) {
      return NextResponse.json(
        { error: `Exchange rate not found for ${from} → ${to}` },
        { status: 404 }
      );
    }

    const cacheInfo = exchangeRateProvider.getCacheInfo();

    return NextResponse.json({
      from,
      to,
      rate,
      cached: cacheInfo.hasCache,
      cacheAge: cacheInfo.age,
      expiresIn: cacheInfo.expiresIn,
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/exchange-rate');
  }
}
