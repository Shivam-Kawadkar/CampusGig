import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, supabaseUrl } from "./env";

/**
 * Service-role client that BYPASSES RLS. Server-only.
 * Use ONLY for trusted operations (webhooks, admin jobs, ranking engine).
 * Never import into client code.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
