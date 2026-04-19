import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { apiError } from "@/lib/api/response";

export async function requireAppUser() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    return {
      appUser: null,
      errorResponse: apiError(401, "UNAUTHORIZED", "Not authenticated."),
    };
  }

  return {
    appUser,
    errorResponse: null,
  };
}

export function requireStaffUser(role?: string | null) {
  if (role === "CAD_DESIGNER") {
    return apiError(403, "FORBIDDEN", "CAD designers cannot access this endpoint.");
  }

  return null;
}
