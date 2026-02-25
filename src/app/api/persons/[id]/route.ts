import { NextRequest, NextResponse } from 'next/server';
import { personRepository } from '@/lib/db/repositories';
import { getAuthUser, AuthError, unauthorizedResponse } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const person = await personRepository.findById(id, user.id);

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('GET /api/persons/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch person' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const body = await request.json();

    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #FF5733)' },
        { status: 400 }
      );
    }

    const updates: { name?: string; color?: string; isDefault?: boolean } = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.color !== undefined) updates.color = body.color;
    if (body.isDefault !== undefined) updates.isDefault = body.isDefault;

    const person = await personRepository.update(id, user.id, updates);
    return NextResponse.json(person);
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('PATCH /api/persons/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update person' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    await personRepository.delete(id, user.id);
    return NextResponse.json({ success: true, message: 'Person deleted successfully' });
  } catch (error) {
    if (error instanceof AuthError) return unauthorizedResponse();
    console.error('DELETE /api/persons/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete person' },
      { status: 500 }
    );
  }
}
