import { NextRequest, NextResponse } from 'next/server';
import { goalRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';
import type { GoalType, AssetType } from '@prisma/client';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_GOAL_TYPES: GoalType[] = ['PORTFOLIO_VALUE', 'MONTHLY_INVESTMENT', 'ASSET_TARGET', 'DIVERSIFICATION'];
const VALID_ASSET_TYPES: AssetType[] = ['ETF', 'STOCK', 'CRYPTO'];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const goal = await goalRepository.findById(id, user.id);

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/goals/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch goal' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const parsed = await parseJsonBody(request);
    if (parsed.error) return parsed.error;
    const body = parsed.data as Record<string, unknown>;

    if (body.type && !VALID_GOAL_TYPES.includes(body.type as GoalType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_GOAL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.assetType && !VALID_ASSET_TYPES.includes(body.assetType as AssetType)) {
      return NextResponse.json(
        { error: `assetType must be one of: ${VALID_ASSET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.targetValue !== undefined && (typeof body.targetValue !== 'number' || body.targetValue <= 0)) {
      return NextResponse.json({ error: 'targetValue must be a positive number' }, { status: 400 });
    }
    if (body.currentValue !== undefined && (typeof body.currentValue !== 'number' || body.currentValue < 0)) {
      return NextResponse.json({ error: 'currentValue must be a non-negative number' }, { status: 400 });
    }

    if (body.name) body.name = (body.name as string).trim();
    if (body.assetSymbol) body.assetSymbol = (body.assetSymbol as string).toUpperCase();

    const goal = await goalRepository.update(id, user.id, body);
    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('PATCH /api/goals/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update goal' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    await goalRepository.delete(id, user.id);
    return NextResponse.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('DELETE /api/goals/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
