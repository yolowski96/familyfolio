import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { transactionRepository, holdingRepository } from '@/lib/db/repositories';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api/handle-error';
import { parseJsonBody } from '@/lib/api-utils';
import type { AssetType, Prisma, TransactionType } from '@prisma/client';

type RouteParams = { params: Promise<{ id: string }> };

const VALID_ASSET_TYPES: AssetType[] = ['ETF', 'STOCK', 'CRYPTO'];
const VALID_TRANSACTION_TYPES: TransactionType[] = ['BUY', 'SELL'];

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const transaction = await transactionRepository.findById(id, user.id);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json(transaction);
  } catch (error) {
    return handleApiError(error, 'GET /api/transactions/[id]');
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

    if (body.personId) {
      // PersonId changes require ownership check since the inner updateMany
      // filters on the existing row's userId, not the new person's owner.
      const count = await prisma.person.count({
        where: { id: body.personId as string, userId: user.id },
      });
      if (count === 0) {
        return NextResponse.json(
          { error: 'Target person not found or does not belong to this user' },
          { status: 404 }
        );
      }
    }

    if (body.assetSymbol) body.assetSymbol = (body.assetSymbol as string).toUpperCase();
    if (body.currency) body.currency = (body.currency as string).toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      if (body.assetSymbol && body.assetName && body.assetType) {
        await tx.asset.upsert({
          where: { symbol: body.assetSymbol as string },
          update: {},
          create: {
            symbol: body.assetSymbol as string,
            name: body.assetName as string,
            type: body.assetType as AssetType,
            currency: (body.currency as string) || 'USD',
            exchange: body.exchange as string | undefined,
          },
        });
      }

      const updateData: Prisma.TransactionUncheckedUpdateInput = {};
      if (body.assetSymbol !== undefined) updateData.assetSymbol = body.assetSymbol as string;
      if (body.assetName !== undefined) updateData.assetName = body.assetName as string;
      if (body.assetType !== undefined) updateData.assetType = body.assetType as AssetType;
      if (body.type !== undefined) updateData.type = body.type as TransactionType;
      if (body.quantity !== undefined) updateData.quantity = body.quantity as number;
      if (body.pricePerUnit !== undefined) updateData.pricePerUnit = body.pricePerUnit as number;
      if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount as number;
      if (body.currency !== undefined) updateData.currency = body.currency as string;
      if (body.fee !== undefined) updateData.fee = body.fee as number;
      if (body.date !== undefined) updateData.date = body.date as Date;
      if (body.exchange !== undefined) updateData.exchange = body.exchange as string | null;
      if (body.notes !== undefined) updateData.notes = body.notes as string | null;

      const updated = await tx.transaction.updateMany({
        where: { id, userId: user.id },
        data: updateData,
      });
      if (updated.count === 0) return null;

      const transaction = await tx.transaction.findFirst({
        where: { id, userId: user.id },
        include: {
          person: { select: { id: true, name: true, color: true } },
          asset: { select: { symbol: true, name: true, type: true } },
        },
      });
      if (!transaction) return null;

      await holdingRepository.recalculateFromTransactions(
        user.id,
        transaction.personId,
        tx
      );

      return transaction;
    });

    if (!result) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/transactions/[id]');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    const personId = await prisma.$transaction(async (tx) => {
      const result = await tx.$queryRaw<{ person_id: string }[]>`
        DELETE FROM transactions
        WHERE id = ${id} AND user_id = ${user.id}
        RETURNING person_id
      `;
      if (result.length === 0) return null;

      const pid = result[0].person_id;
      await holdingRepository.recalculateFromTransactions(user.id, pid, tx);
      return pid;
    });

    if (!personId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/transactions/[id]');
  }
}
