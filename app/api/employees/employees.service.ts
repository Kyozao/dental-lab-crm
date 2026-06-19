import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";

import { getSingleLabMembership } from "../_shared/membership";
import type {
  CreateEmployeeInput,
  UpdateEmployeeRoleInput,
  UpdateEmployeeProcessesInput,
} from "./employees.schemas";
import {
  assertCanAssignEmployeeProcesses,
  assertCanManageEmployees,
  assertCanViewEmployees,
  assertUserHasNoLabMembership,
  canAssignEmployeeProcesses,
  EmployeeAuthorizationError,
  EmployeeConflictError,
} from "./employees.rules";
import { ReferenceValidationError } from "../_shared/reference-resource";

export { EmployeeAuthorizationError, EmployeeConflictError };
export { SupabaseAdminConfigError };

type EmployeeListItem = {
  id: string;
  lab_member_id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  processes: Array<{
    id: string;
    name: string;
  }>;
};

type EmployeeRecord = {
  id: string;
  users: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
  };
  processOwnerships?: Array<{
    processes: {
      id: string;
      name: string;
    };
  }>;
  role: UserRole;
  created_at: Date;
};

export class EmployeeNotFoundError extends Error {
  constructor(message = "Employee not found.") {
    super(message);
    this.name = "EmployeeNotFoundError";
  }
}

export class EmployeeInviteError extends Error {
  constructor(message = "Failed to send employee invite.") {
    super(message);
    this.name = "EmployeeInviteError";
  }
}

export class EmployeeRoleUpdateError extends Error {
  constructor(message = "Employee role cannot be updated.") {
    super(message);
    this.name = "EmployeeRoleUpdateError";
  }
}

function serializeEmployee(item: EmployeeRecord): EmployeeListItem {
  return {
    id: item.id,
    lab_member_id: item.id,
    user_id: item.users.id,
    name: item.users.name,
    email: item.users.email,
    role: item.role,
    is_active: item.users.is_active,
    created_at: item.created_at.toISOString(),
    processes:
      item.processOwnerships?.map((assignment) => assignment.processes) ?? [],
  };
}

function buildEmployeeSelect(lab_id: string) {
  return {
    id: true,
    role: true,
    created_at: true,
    processOwnerships: {
      where: { lab_id },
      select: {
        processes: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: "asc",
      },
    },
    users: {
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
      },
    },
  } as const;
}

function getInviteRedirectTo() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  return appUrl ? `${appUrl.replace(/\/$/, "")}/login` : undefined;
}

async function requireEmployeeManager(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanManageEmployees(membership.role);
  return membership;
}

async function requireEmployeeViewer(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanViewEmployees(membership.role);
  return membership;
}

async function requireProcessAssignmentManager(user_id: string) {
  const membership = await getSingleLabMembership(user_id);
  assertCanAssignEmployeeProcesses(membership.role);
  return membership;
}

export async function listEmployeesForLoggedLab(user_id: string) {
  const membership = await requireEmployeeViewer(user_id);
  const { lab_id } = membership;
  const employees = await prisma.lab_members.findMany({
    where: {
      lab_id,
      users: {
        deleted_at: null,
      },
    },
    select: buildEmployeeSelect(lab_id),
    orderBy: [{ role: "asc" }, { created_at: "asc" }],
  });

  return {
    employees: employees.map(serializeEmployee),
    currentUserRole: membership.role,
    canInviteEmployees:
      membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN,
  };
}

export async function getEmployeeForLoggedLab(
  user_id: string,
  lab_member_id: string,
) {
  const membership = await requireEmployeeViewer(user_id);
  const employee = await prisma.lab_members.findFirst({
    where: {
      id: lab_member_id,
      lab_id: membership.lab_id,
      users: {
        deleted_at: null,
      },
    },
    select: buildEmployeeSelect(membership.lab_id),
  });

  if (!employee) {
    throw new EmployeeNotFoundError();
  }

  return {
    employee: serializeEmployee(employee),
    currentUserRole: membership.role,
    canAssignProcesses: canAssignEmployeeProcesses(membership.role),
    canEditRole:
      membership.role === UserRole.OWNER || membership.role === UserRole.ADMIN,
  };
}

export async function inviteEmployeeForLoggedLab(
  user_id: string,
  payload: CreateEmployeeInput,
) {
  const { lab_id } = await requireEmployeeManager(user_id);
  const existingUser = await prisma.users.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      memberships: {
        select: { id: true },
      },
    },
  });

  assertUserHasNoLabMembership(existingUser?.memberships.length ?? 0);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    payload.email,
    {
      data: {
        name: payload.name,
        role: payload.role,
      },
      redirectTo: getInviteRedirectTo(),
    },
  );

  if (error || !data.user) {
    throw new EmployeeInviteError(error?.message);
  }

  const invitedUserId = data.user.id;
  const employee = await prisma.$transaction(async (tx) => {
    const userByEmail = await tx.users.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (userByEmail && userByEmail.id !== invitedUserId) {
      await tx.users.update({
        where: { email: payload.email },
        data: {
          id: invitedUserId,
          name: payload.name,
          is_active: true,
          deleted_at: null,
        },
      });
    } else {
      await tx.users.upsert({
        where: { id: invitedUserId },
        update: {
          name: payload.name,
          email: payload.email,
          is_active: true,
          deleted_at: null,
        },
        create: {
          id: invitedUserId,
          name: payload.name,
          email: payload.email,
        },
      });
    }

    return tx.lab_members.create({
      data: {
        user_id: invitedUserId,
        lab_id,
        role: payload.role,
      },
      select: {
        id: true,
        role: true,
        created_at: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            is_active: true,
          },
        },
      },
    });
  });

  return serializeEmployee(employee);
}

export async function updateEmployeeProcessesForLoggedLab(
  user_id: string,
  lab_member_id: string,
  payload: UpdateEmployeeProcessesInput,
) {
  const { lab_id } = await requireProcessAssignmentManager(user_id);

  const [employee, activeProcesses] = await Promise.all([
    prisma.lab_members.findFirst({
      where: {
        id: lab_member_id,
        lab_id,
        users: {
          is_active: true,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        role: true,
        created_at: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            is_active: true,
          },
        },
      },
    }),
    prisma.processes.findMany({
      where: {
        lab_id,
        is_active: true,
        deleted_at: null,
        id: { in: payload.process_ids },
      },
      select: { id: true },
    }),
  ]);

  if (!employee) {
    throw new ReferenceValidationError({
      lab_member_id: [
        "Employee is inactive, archived, or not assigned to this lab.",
      ],
    });
  }

  const activeProcessIds = new Set(activeProcesses.map((process) => process.id));
  const invalidProcessIds = payload.process_ids.filter(
    (processId) => !activeProcessIds.has(processId),
  );

  if (invalidProcessIds.length > 0) {
    throw new ReferenceValidationError({
      process_ids: ["One or more processes are inactive, archived, or outside this lab."],
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee_process_assignments.deleteMany({
      where: {
        lab_id,
        lab_member_id,
        process_id: { notIn: payload.process_ids },
      },
    });

    if (payload.process_ids.length === 0) return;

    await tx.employee_process_assignments.createMany({
      data: payload.process_ids.map((process_id) => ({
        lab_id,
        lab_member_id,
        process_id,
      })),
      skipDuplicates: true,
    });
  });

  const orderedProcesses = payload.process_ids
    .map((processId) => activeProcesses.find((process) => process.id === processId))
    .filter((process): process is { id: string; name: string } => Boolean(process));

  return serializeEmployee({
    id: employee.id,
    role: employee.role,
    created_at: employee.created_at,
    users: employee.users,
    processOwnerships: orderedProcesses.map((process) => ({
      processes: process,
    })),
  });
}

export async function updateEmployeeRoleForLoggedLab(
  user_id: string,
  lab_member_id: string,
  payload: UpdateEmployeeRoleInput,
) {
  const { lab_id } = await requireEmployeeManager(user_id);

  const existingEmployee = await prisma.lab_members.findFirst({
    where: {
      id: lab_member_id,
      lab_id,
      users: {
        deleted_at: null,
      },
    },
    select: buildEmployeeSelect(lab_id),
  });

  if (!existingEmployee) {
    throw new EmployeeNotFoundError();
  }

  if (existingEmployee.role === UserRole.OWNER) {
    throw new EmployeeRoleUpdateError(
      "Owner role cannot be changed from employee management.",
    );
  }

  const updatedEmployee = await prisma.lab_members.update({
    where: {
      id: lab_member_id,
    },
    data: {
      role: payload.role,
    },
    select: buildEmployeeSelect(lab_id),
  });

  return serializeEmployee(updatedEmployee);
}
