import { NextRequest, NextResponse } from 'next/server';
import { transactionRepository, holdingRepository, personRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include') || '';
    const parts = include.split(',').filter(Boolean);

    const wantTransactions = parts.includes('transactions');
    const wantPersons = parts.includes('persons');
    const wantHoldings = parts.includes('holdings');

    const [transactions, persons, holdings] = await Promise.all([
      wantTransactions ? transactionRepository.findAllLean(user.id) : null,
      wantPersons ? personRepository.findAll(user.id) : null,
      wantHoldings ? holdingRepository.findAllLean(user.id) : null,
    ]);

    const result: Record<string, unknown> = {};
    if (transactions !== null) result.transactions = transactions;
    if (persons !== null) result.persons = persons;
    if (holdings !== null) result.holdings = holdings;

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/portfolio error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
