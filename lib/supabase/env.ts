/**
 * Centralized Supabase env access.
 * Until a Supabase project is connected (keys in .env.local), `isSupabaseConfigured`
 * is false and the app degrades gracefully (auth disabled, public pages still work).
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/** Server-only service role key (never expose to the client). */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (server only).");
  }
  return key;
}
