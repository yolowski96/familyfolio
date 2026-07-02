import { NextRequest, NextResponse } from 'next/server';
import { transactionRepository, holdingRepository, personRepository } from '@/lib/db/repositories';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api/handle-error';

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
    return handleApiError(error, 'GET /api/portfolio');
  }
}
