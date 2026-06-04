import { apiError } from "@/lib/api/response";
import { getMockUser } from "@/lib/mock-data/store";

export async function requireAppUser() {
  return {
    appUser: getMockUser(),
    errorResponse: null,
  };
}

export function requireStaffUser(role?: string | null) {
  if (role === "CAD_DESIGNER") {
    return apiError(
      403,
      "FORBIDDEN",
      "CAD designers cannot access this endpoint.",
    );
  }

  return null;
}
