import { NextRequest, NextResponse } from 'next/server';
import { transactionRepository, holdingRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';
import type { AssetType, TransactionType } from '@prisma/client';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_ASSET_TYPES: AssetType[] = ['ETF', 'STOCK', 'CRYPTO'];
const VALID_TRANSACTION_TYPES: TransactionType[] = ['BUY', 'SELL'];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const transaction = await transactionRepository.findById(id, user.id);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/transactions/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transaction' },
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

    if (body.assetType && !VALID_ASSET_TYPES.includes(body.assetType as AssetType)) {
      return NextResponse.json(
        { error: `assetType must be one of: ${VALID_ASSET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.type && !VALID_TRANSACTION_TYPES.includes(body.type as TransactionType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity <= 0)) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 });
    }
    if (body.pricePerUnit !== undefined && (typeof body.pricePerUnit !== 'number' || body.pricePerUnit < 0)) {
      return NextResponse.json({ error: 'pricePerUnit must be a non-negative number' }, { status: 400 });
    }
    if (body.totalAmount !== undefined && (typeof body.totalAmount !== 'number' || body.totalAmount < 0)) {
      return NextResponse.json({ error: 'totalAmount must be a non-negative number' }, { status: 400 });
    }

    if (body.date) {
      const date = new Date(body.date as string);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'date must be a valid date' }, { status: 400 });
      }
      body.date = date;
    }

    if (body.assetSymbol) body.assetSymbol = (body.assetSymbol as string).toUpperCase();
    if (body.currency) body.currency = (body.currency as string).toUpperCase();

    const transaction = await transactionRepository.update(id, user.id, body);
    await holdingRepository.recalculateFromTransactions(user.id, transaction.personId);
    return NextResponse.json(transaction);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('PATCH /api/transactions/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    // Use fast delete that returns personId without fetching relations
    const personId = await transactionRepository.deleteFast(id, user.id);
    if (!personId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Recalculate holdings in background - don't block the response
    holdingRepository.recalculateFromTransactions(user.id, personId)
      .catch(err => console.error('Background holding recalculation failed:', err));

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('DELETE /api/transactions/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
