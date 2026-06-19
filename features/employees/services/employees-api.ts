import type {
  CreateEmployeePayload,
  EmployeeDetailResult,
  Employee,
  EmployeeListResult,
  EmployeeProcess,
  EmployeeRole,
} from "@/features/employees/types";
import type { UserRole } from "@/generated/prisma/enums";

type ApiSuccess<T> = {
  data: T;
  error: null;
  meta: Record<string, unknown>;
};

type ApiError = {
  error?: string;
  fields?: Record<string, string[]>;
};

async function parseApiError(response: Response) {
  try {
    const body = (await response.json()) as ApiError;
    return body.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export async function listEmployeesApi() {
  const response = await fetch("/api/employees", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const body = (await response.json()) as ApiSuccess<Employee[]> & {
    meta: {
      currentUserRole?: UserRole;
      canInviteEmployees?: boolean;
    };
  };

  return {
    employees: body.data,
    currentUserRole: body.meta.currentUserRole ?? null,
    canInviteEmployees: Boolean(body.meta.canInviteEmployees),
  } satisfies EmployeeListResult;
}

export async function createEmployeeApi(payload: CreateEmployeePayload) {
  const response = await fetch("/api/employees", {
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

  const body = (await response.json()) as ApiSuccess<Employee>;
  return body.data;
}

export async function getEmployeeApi(employeeId: string) {
  const response = await fetch(`/api/employees/${employeeId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const body = (await response.json()) as ApiSuccess<Employee> & {
    meta: {
      currentUserRole?: UserRole;
      canAssignProcesses?: boolean;
      canEditRole?: boolean;
    };
  };

  return {
    employee: body.data,
    currentUserRole: body.meta.currentUserRole ?? null,
    canAssignProcesses: Boolean(body.meta.canAssignProcesses),
    canEditRole: Boolean(body.meta.canEditRole),
  } satisfies EmployeeDetailResult;
}

export async function updateEmployeeRoleApi(
  employeeId: string,
  role: EmployeeRole,
) {
  const response = await fetch(`/api/employees/${employeeId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const body = (await response.json()) as ApiSuccess<Employee>;
  return body.data;
}

export async function updateEmployeeProcessesApi(
  employeeId: string,
  processIds: string[],
) {
  const response = await fetch(`/api/employees/${employeeId}/processes`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ process_ids: processIds }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const body = (await response.json()) as ApiSuccess<Employee>;
  return body.data;
}

export async function listEmployeeProcessesApi() {
  const response = await fetch("/api/processes", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const body = (await response.json()) as ApiSuccess<EmployeeProcess[]>;
  return body.data;
}
