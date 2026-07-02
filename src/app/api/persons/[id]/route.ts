import { NextRequest, NextResponse } from 'next/server';
import { personRepository, type UpdatePersonInput } from '@/lib/db/repositories';
import { getAuthUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api/handle-error';
import { hashApiKey, validateApiKeyFormat } from '@/lib/api/api-key-auth';
import { parseJsonBody } from '@/lib/api-utils';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const person = await personRepository.findById(id, user.id);

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (error) {
    return handleApiError(error, 'GET /api/persons/[id]');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;
    const parsed = await parseJsonBody(request);
    if (parsed.error) return parsed.error;
    const body = parsed.data as Record<string, unknown>;

    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color as string)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #FF5733)' },
        { status: 400 }
      );
    }

    const updates: UpdatePersonInput = {};
    if (body.name !== undefined) updates.name = (body.name as string).trim();
    if (body.color !== undefined) updates.color = body.color as string;
    if (body.isDefault !== undefined) updates.isDefault = body.isDefault as boolean;

    // apiKey: string sets a new external key, null/empty string removes it.
    if (body.apiKey !== undefined) {
      if (body.apiKey === null || body.apiKey === '') {
        updates.apiKeyHash = null;
        updates.apiKeyPrefix = null;
      } else if (typeof body.apiKey === 'string') {
        const apiKey = body.apiKey.trim();
        const formatError = validateApiKeyFormat(apiKey);
        if (formatError) {
          return NextResponse.json({ error: formatError }, { status: 400 });
        }
        const apiKeyHash = hashApiKey(apiKey);
        // Friendlier than the generic P2002 conflict from the unique index,
        // which still backstops the (negligible) race.
        const existing = await personRepository.findByApiKeyHash(apiKeyHash);
        if (existing && existing.id !== id) {
          return NextResponse.json(
            { error: 'This API key is already assigned to another person' },
            { status: 409 }
          );
        }
        updates.apiKeyHash = apiKeyHash;
        updates.apiKeyPrefix = apiKey.slice(0, 8) + '…';
      } else {
        return NextResponse.json({ error: 'apiKey must be a string or null' }, { status: 400 });
      }
    }

    const person = await personRepository.update(id, user.id, updates);
    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    return NextResponse.json(person);
  } catch (error) {
    return handleApiError(error, 'PATCH /api/persons/[id]');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    const { id } = await params;

    const deleted = await personRepository.delete(id, user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Person deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'DELETE /api/persons/[id]');
  }
}
