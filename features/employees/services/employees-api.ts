import type {
  CreateEmployeePayload,
  EmployeeDetailResult,
  EmployeeDashboard,
  Employee,
  EmployeeListResult,
  EmployeeProcess,
  EmployeeRole,
  EmployeeScheduleProfile,
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
      labCurrency?: string;
      canAssignProcesses?: boolean;
      canEditRole?: boolean;
      canManageCapacity?: boolean;
      scheduleProfile?: EmployeeScheduleProfile | null;
      employeeDashboard?: EmployeeDashboard | null;
    };
  };

  return {
    employee: body.data,
    scheduleProfile: body.meta.scheduleProfile ?? null,
    dashboard: body.meta.employeeDashboard ?? null,
    labCurrency: body.meta.labCurrency ?? "BRL",
    currentUserRole: body.meta.currentUserRole ?? null,
    canAssignProcesses: Boolean(body.meta.canAssignProcesses),
    canEditRole: Boolean(body.meta.canEditRole),
    canManageCapacity: Boolean(body.meta.canManageCapacity),
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

export async function updateEmployeeProductivityApi(
  employeeId: string,
  assignments: Array<{
    process_id: string;
    productivity_points_per_hour: string;
  }>,
) {
  const response = await fetch(`/api/employees/${employeeId}/productivity`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assignments }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function updateEmployeeLaborCostsApi(
  employeeId: string,
  assignments: Array<{
    process_id: string;
    labor_cost_override: string | null;
  }>,
) {
  const response = await fetch(`/api/employees/${employeeId}/labor-costs`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assignments }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

export async function updateEmployeeAvailabilityApi(
  employeeId: string,
  payload: {
    weekday_capacities: Array<{
      id?: string;
      day_of_week: number;
      available_minutes: number;
    }>;
    exceptions: Array<{
      id?: string;
      exception_date: string;
      available_minutes: number;
      reason?: string | null;
    }>;
  },
) {
  const response = await fetch(`/api/employees/${employeeId}/availability`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}
