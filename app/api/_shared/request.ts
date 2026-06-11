import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
 
  if (error || !user) return null;
  return user.id;
}
type JsonObjectResult =
  | { data: Record<string, unknown>; error: null }
  | { data: null; error: string };

export async function parseJsonObject(
  request: Request, 
): Promise<JsonObjectResult> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      data: null,
      error: "Request body must be valid JSON.",
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      data: null,
      error: "Request body must be a JSON object.",
    };
  }

  return {
    data: payload as Record<string, unknown>,
    error: null,
  };
}
