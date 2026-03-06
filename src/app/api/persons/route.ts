import { NextRequest, NextResponse } from 'next/server';
import { personRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';
import { parseJsonBody } from '@/lib/api-utils';

export async function GET() {
  try {
    const user = await getAuthUser();
    const persons = await personRepository.findAll(user.id);
    return NextResponse.json(persons);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/persons error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch persons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const parsed = await parseJsonBody(request);
    if (parsed.error) return parsed.error;
    const { name, color, isDefault } = parsed.data as Record<string, unknown>;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required and must be a string' }, { status: 400 });
    }
    if (!color || typeof color !== 'string') {
      return NextResponse.json({ error: 'Color is required and must be a string' }, { status: 400 });
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color as string)) {
      return NextResponse.json({ error: 'Color must be a valid hex color (e.g., #FF5733)' }, { status: 400 });
    }

    const person = await personRepository.create(user.id, {
      name: (name as string).trim(),
      color: color as string,
      isDefault: (isDefault as boolean) || false,
    });

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('POST /api/persons error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create person' },
      { status: 500 }
    );
  }
}
