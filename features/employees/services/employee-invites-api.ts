import type { EmployeeInviteDetails } from "@/features/employees/types";

type ApiSuccess<T> = {
  data: T;
  error: null;
  meta: Record<string, unknown>;
};

type ApiError = {
  error?: string;
};

async function parseApiError(response: Response) {
  try {
    const body = (await response.json()) as ApiError;
    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export async function getEmployeeInviteDetailsApi(inviteId: string) {
  const response = await fetch(`/api/employee-invites/${inviteId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const body = (await response.json()) as ApiSuccess<EmployeeInviteDetails>;
  return body.data;
}

export async function acceptEmployeeInviteApi(inviteId: string, payload: {
  name: string;
}) {
  const response = await fetch(`/api/employee-invites/${inviteId}/accept`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const body = (await response.json()) as ApiSuccess<{ redirect_to: string }>;
  return body.data;
}
