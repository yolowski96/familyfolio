import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/env';

function getSafeRedirectUrl(baseUrl: string, path: string): string {
  const safePath = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  return `${baseUrl}${safePath}`;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const baseUrl = APP_URL || origin;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(getSafeRedirectUrl(baseUrl, next));
    }
  }

  return NextResponse.redirect(getSafeRedirectUrl(baseUrl, '/login?error=auth_callback_failed'));
}
