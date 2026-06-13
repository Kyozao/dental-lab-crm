import "server-only";

import { createClient } from "@supabase/supabase-js";

export class SupabaseAdminConfigError extends Error {
  constructor() {
    super("SUPABASE_SERVICE_ROLE_KEY is not configured.");
    this.name = "SupabaseAdminConfigError";
  }
}

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new SupabaseAdminConfigError();
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
