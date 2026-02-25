import { NextRequest, NextResponse } from 'next/server';
import { goalRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import type { GoalType, AssetType } from '@prisma/client';

const VALID_GOAL_TYPES: GoalType[] = ['PORTFOLIO_VALUE', 'MONTHLY_INVESTMENT', 'ASSET_TARGET', 'DIVERSIFICATION'];
const VALID_ASSET_TYPES: AssetType[] = ['ETF', 'STOCK', 'CRYPTO'];

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('personId');
    const incomplete = searchParams.get('incomplete');

    if (incomplete === 'true') {
      const goals = await goalRepository.findIncomplete(user.id);
      return NextResponse.json(goals);
    }
    if (personId) {
      const goals = await goalRepository.findByPersonId(user.id, personId);
      return NextResponse.json(goals);
    }

    const goals = await goalRepository.findAll(user.id);
    return NextResponse.json(goals);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/goals error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required and must be a string' }, { status: 400 });
    }
    if (!body.type || !VALID_GOAL_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_GOAL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (typeof body.targetValue !== 'number' || body.targetValue <= 0) {
      return NextResponse.json({ error: 'targetValue must be a positive number' }, { status: 400 });
    }
    if (body.assetType && !VALID_ASSET_TYPES.includes(body.assetType)) {
      return NextResponse.json(
        { error: `assetType must be one of: ${VALID_ASSET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.deadline) {
      const deadline = new Date(body.deadline);
      if (isNaN(deadline.getTime())) {
        return NextResponse.json({ error: 'deadline must be a valid date' }, { status: 400 });
      }
    }

    const goal = await goalRepository.create(user.id, {
      personId: body.personId,
      name: body.name.trim(),
      type: body.type,
      targetValue: body.targetValue,
      deadline: body.deadline,
      assetSymbol: body.assetSymbol?.toUpperCase(),
      assetType: body.assetType,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('POST /api/goals error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create goal' },
      { status: 500 }
    );
  }
}
