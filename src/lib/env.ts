function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `See .env.example for the full list of required variables.`
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

// Client-safe (NEXT_PUBLIC_*) — used in both client and server code
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// App URL for redirect validation (optional, falls back to request origin)
export const APP_URL = optional('NEXT_PUBLIC_APP_URL');

// Server-only — never exposed to the browser bundle
export const COINGECKO_API_KEY = optional('COINGECKO_API_KEY');
