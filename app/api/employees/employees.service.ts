import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";

import {
  findSupabaseAuthUserByEmail,
  normalizeEmail,
} from "../auth/auth.service";
import { ReferenceValidationError } from "../_shared/reference-resource";
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
  canAssignEmployeeProcesses,
  EmployeeAuthorizationError,
  EmployeeConflictError,
} from "./employees.rules";

export { EmployeeAuthorizationError, EmployeeConflictError };
export { SupabaseAdminConfigError };

type EmployeeListItem = {
  id: string;
  lab_member_id: string | null;
  user_id: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: "ACTIVE" | "PENDING";
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

type PendingInviteRecord = {
  id: string;
  name: string;
  email: string;
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
    status: "ACTIVE",
    is_active: item.users.is_active,
    created_at: item.created_at.toISOString(),
    processes:
      item.processOwnerships?.map((assignment) => assignment.processes) ?? [],
  };
}

function serializePendingInvite(item: PendingInviteRecord): EmployeeListItem {
  return {
    id: item.id,
    lab_member_id: null,
    user_id: null,
    name: item.name,
    email: item.email,
    role: item.role,
    status: "PENDING",
    is_active: false,
    created_at: item.created_at.toISOString(),
    processes: [],
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

function getInviteRedirectTo(inviteId: string) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!appUrl) {
    return undefined;
  }

  const redirectUrl = new URL("/employee-invite/accept", appUrl.replace(/\/$/, ""));
  redirectUrl.searchParams.set("invite", inviteId);
  return redirectUrl.toString();
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

async function ensureEmployeeInviteCanBeSent(options: {
  email: string;
  lab_id: string;
  pendingInvite:
    | {
        id: string;
        lab_id: string;
        auth_user_id: string | null;
      }
    | null;
}) {
  const normalizedEmail = normalizeEmail(options.email);

  const existingUser = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new EmployeeConflictError(
      "An account with this email already exists. Employee invites currently support only new users.",
    );
  }

  const authUser = await findSupabaseAuthUserByEmail(normalizedEmail);
  if (!authUser) {
    return;
  }

  const canReusePendingInvite =
    options.pendingInvite !== null &&
    options.pendingInvite.lab_id === options.lab_id &&
    (
      options.pendingInvite.auth_user_id === null ||
      options.pendingInvite.auth_user_id === authUser.id
    );

  if (!canReusePendingInvite) {
    throw new EmployeeConflictError(
      "An account or pending invite with this email already exists. Employee invites currently support only new users.",
    );
  }
}

async function createOrUpdatePendingInvite(options: {
  lab_id: string;
  invited_by_user_id: string;
  payload: CreateEmployeeInput;
  pendingInvite:
    | {
        id: string;
      }
    | null;
}) {
  if (options.pendingInvite) {
    return prisma.employee_invites.update({
      where: { id: options.pendingInvite.id },
      data: {
        name: options.payload.name,
        email: options.payload.email,
        role: options.payload.role,
        invited_by_user_id: options.invited_by_user_id,
        cancelled_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
    });
  }

  return prisma.employee_invites.create({
    data: {
      lab_id: options.lab_id,
      invited_by_user_id: options.invited_by_user_id,
      name: options.payload.name,
      email: options.payload.email,
      role: options.payload.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });
}

export async function listEmployeesForLoggedLab(user_id: string) {
  const membership = await requireEmployeeViewer(user_id);
  const { lab_id } = membership;

  const [employees, pendingInvites] = await Promise.all([
    prisma.lab_members.findMany({
      where: {
        lab_id,
        users: {
          deleted_at: null,
        },
      },
      select: buildEmployeeSelect(lab_id),
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
    }),
    prisma.employee_invites.findMany({
      where: {
        lab_id,
        accepted_at: null,
        cancelled_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: [{ created_at: "desc" }],
    }),
  ]);

  return {
    employees: [
      ...employees.map(serializeEmployee),
      ...pendingInvites.map(serializePendingInvite),
    ],
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

  const pendingInvite = await prisma.employee_invites.findFirst({
    where: {
      email: payload.email,
      accepted_at: null,
      cancelled_at: null,
    },
    select: {
      id: true,
      lab_id: true,
      auth_user_id: true,
    },
  });

  if (pendingInvite && pendingInvite.lab_id !== lab_id) {
    throw new EmployeeConflictError(
      "This email already has a pending invite in another lab.",
    );
  }

  await ensureEmployeeInviteCanBeSent({
    email: payload.email,
    lab_id,
    pendingInvite,
  });

  const inviteRecord = await createOrUpdatePendingInvite({
    lab_id,
    invited_by_user_id: user_id,
    payload,
    pendingInvite,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    payload.email,
    {
      data: {
        name: payload.name,
        role: payload.role,
        invite_id: inviteRecord.id,
      },
      redirectTo: getInviteRedirectTo(inviteRecord.id),
    },
  );

  if (error || !data.user) {
    if (!pendingInvite) {
      await prisma.employee_invites.delete({
        where: { id: inviteRecord.id },
      }).catch(() => undefined);
    }

    throw new EmployeeInviteError(error?.message);
  }

  const updatedInvite = await prisma.employee_invites.update({
    where: { id: inviteRecord.id },
    data: {
      auth_user_id: data.user.id,
      last_sent_at: new Date(),
      name: payload.name,
      role: payload.role,
      invited_by_user_id: user_id,
      cancelled_at: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  return serializePendingInvite(updatedInvite);
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
      select: { id: true, name: true },
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
