import { NextRequest, NextResponse } from 'next/server';
import { transactionRepository, holdingRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';
import type { AssetType, TransactionType } from '@prisma/client';

const VALID_ASSET_TYPES: AssetType[] = ['ETF', 'STOCK', 'CRYPTO'];
const VALID_TRANSACTION_TYPES: TransactionType[] = ['BUY', 'SELL'];

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);

    const filters: {
      personId?: string;
      assetSymbol?: string;
      assetType?: AssetType;
      type?: TransactionType;
      dateFrom?: Date;
      dateTo?: Date;
    } = {};

    const personId = searchParams.get('personId');
    const assetSymbol = searchParams.get('assetSymbol');
    const assetType = searchParams.get('assetType') as AssetType | null;
    const type = searchParams.get('type') as TransactionType | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (personId) filters.personId = personId;
    if (assetSymbol) filters.assetSymbol = assetSymbol;
    if (assetType && VALID_ASSET_TYPES.includes(assetType)) filters.assetType = assetType;
    if (type && VALID_TRANSACTION_TYPES.includes(type)) filters.type = type;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    const transactions = await transactionRepository.findAll(user.id, filters);
    return NextResponse.json(transactions);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const parsed = await parseJsonBody(request);
    if (parsed.error) return parsed.error;
    const body = parsed.data as Record<string, unknown>;

    const requiredFields = [
      'personId', 'assetSymbol', 'assetName', 'assetType',
      'type', 'quantity', 'pricePerUnit', 'totalAmount', 'currency', 'date',
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    if (!VALID_ASSET_TYPES.includes(body.assetType as AssetType)) {
      return NextResponse.json(
        { error: `assetType must be one of: ${VALID_ASSET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!VALID_TRANSACTION_TYPES.includes(body.type as TransactionType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    if (typeof body.quantity !== 'number' || body.quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 });
    }
    if (typeof body.pricePerUnit !== 'number' || body.pricePerUnit < 0) {
      return NextResponse.json({ error: 'pricePerUnit must be a non-negative number' }, { status: 400 });
    }
    if (typeof body.totalAmount !== 'number' || body.totalAmount < 0) {
      return NextResponse.json({ error: 'totalAmount must be a non-negative number' }, { status: 400 });
    }

    const date = new Date(body.date as string);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'date must be a valid date' }, { status: 400 });
    }

    const transactionData = {
      personId: body.personId as string,
      assetSymbol: (body.assetSymbol as string).toUpperCase(),
      assetName: body.assetName as string,
      assetType: body.assetType as AssetType,
      type: body.type as TransactionType,
      quantity: body.quantity as number,
      pricePerUnit: body.pricePerUnit as number,
      totalAmount: body.totalAmount as number,
      currency: (body.currency as string).toUpperCase(),
      fee: (body.fee as number) || 0,
      date,
      exchange: body.exchange as string | undefined,
      notes: body.notes as string | undefined,
    };

    const transaction = await transactionRepository.create(user.id, transactionData);

    // Update holding in background - don't wait for it to return response faster
    holdingRepository.updateHoldingForTransaction(user.id, transactionData.personId, {
      assetSymbol: transactionData.assetSymbol,
      assetName: transactionData.assetName,
      assetType: transactionData.assetType,
      type: transactionData.type,
      quantity: transactionData.quantity,
      pricePerUnit: transactionData.pricePerUnit,
      totalAmount: transactionData.totalAmount,
      fee: transactionData.fee,
      currency: transactionData.currency,
    }).catch(err => console.error('Background holding update failed:', err));

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('POST /api/transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
