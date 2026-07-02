import {
  getCurrentSupabaseUser,
  syncCurrentAppUser,
  type AuthenticatedUser,
} from "./current-user";

type AuthOptions = {
  ensureAppUser?: boolean;
};

export async function getAuthenticatedUser(
  options?: AuthOptions,
): Promise<AuthenticatedUser | null> {
  const user = await getCurrentSupabaseUser();
  if (!user) {
    return null;
  }

  if (options?.ensureAppUser) {
    await syncCurrentAppUser(user);
  }

  return user;
}

export async function getAuthenticatedUserId(options?: AuthOptions) {
  const user = await getAuthenticatedUser(options);
  return user?.id ?? null;
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
