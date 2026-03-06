import { NextResponse } from 'next/server';

type ParseResult<T = unknown> =
  | { data: T; error?: never }
  | { data?: never; error: NextResponse };

export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<ParseResult<T>> {
  const contentType = request.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return {
      error: NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      ),
    };
  }

  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    };
  }
}
