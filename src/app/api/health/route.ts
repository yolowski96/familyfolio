import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Lightweight health-check / DB keep-alive endpoint.
 *
 * The primary purpose is to stop the Supabase free-tier database from
 * scaling to zero. A Vercel cron job pings this route every few minutes;
 * the `SELECT 1` forces a real round-trip to Postgres, which is enough to
 * keep the instance warm and avoids the ~3-4 s cold wake-up observed on
 * the first user request after idle.
 *
 * Intentionally:
 *   - No auth (must be publicly reachable by the cron).
 *   - No business-data selects (keep it cheap).
 *   - `dynamic = 'force-dynamic'` so Next.js never serves this from a
 *     static cache, which would defeat the purpose.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error('[health] db ping failed', error);
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown',
      },
      { status: 503 }
    );
  }
}
