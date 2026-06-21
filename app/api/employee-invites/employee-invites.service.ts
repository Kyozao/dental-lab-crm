import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { normalizeEmail } from "../auth/auth.service";
import type { AcceptEmployeeInviteInput } from "./employee-invites.schemas";

export class EmployeeInviteNotFoundError extends Error {
  constructor(message = "Employee invite not found.") {
    super(message);
    this.name = "EmployeeInviteNotFoundError";
  }
}

export class EmployeeInviteAccessError extends Error {
  constructor(message = "This invite does not belong to the current session.") {
    super(message);
    this.name = "EmployeeInviteAccessError";
  }
}

export class EmployeeInviteStateError extends Error {
  constructor(message = "This invite is no longer active.") {
    super(message);
    this.name = "EmployeeInviteStateError";
  }
}

function getPostAcceptPath(role: UserRole) {
  return role === UserRole.PRODUCTION ? "/production" : "/cases";
}

async function getInviteForAuthenticatedUser(user: {
  id: string;
  email: string;
}, inviteId: string) {
  const invite = await prisma.employee_invites.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      lab_id: true,
      auth_user_id: true,
      name: true,
      email: true,
      role: true,
      accepted_at: true,
      cancelled_at: true,
      labs: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invite) {
    throw new EmployeeInviteNotFoundError();
  }

  if (invite.accepted_at || invite.cancelled_at) {
    throw new EmployeeInviteStateError(
      invite.accepted_at
        ? "This invite has already been accepted."
        : "This invite has been cancelled.",
    );
  }

  if (normalizeEmail(invite.email) !== normalizeEmail(user.email)) {
    throw new EmployeeInviteAccessError();
  }

  if (invite.auth_user_id && invite.auth_user_id !== user.id) {
    throw new EmployeeInviteAccessError();
  }

  return invite;
}

export async function getEmployeeInviteForAuthenticatedUser(
  user: { id: string; email: string },
  inviteId: string,
) {
  const invite = await getInviteForAuthenticatedUser(user, inviteId);

  return {
    id: invite.id,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    lab_name: invite.labs.name,
  };
}

export async function acceptEmployeeInviteForAuthenticatedUser(
  user: { id: string; email: string },
  inviteId: string,
  payload: AcceptEmployeeInviteInput,
) {
  const invite = await getInviteForAuthenticatedUser(user, inviteId);

  return prisma.$transaction(async (tx) => {
    const existingMembership = await tx.lab_members.findUnique({
      where: { user_id: user.id },
      select: {
        id: true,
        lab_id: true,
      },
    });

    if (existingMembership && existingMembership.lab_id !== invite.lab_id) {
      throw new EmployeeInviteStateError(
        "This account already belongs to another lab. Multi-lab membership is not supported yet.",
      );
    }

    await tx.users.upsert({
      where: { id: user.id },
      update: {
        name: payload.name,
        email: invite.email,
        is_active: true,
        deleted_at: null,
      },
      create: {
        id: user.id,
        name: payload.name,
        email: invite.email,
        is_active: true,
      },
    });

    if (!existingMembership) {
      await tx.lab_members.create({
        data: {
          user_id: user.id,
          lab_id: invite.lab_id,
          role: invite.role,
        },
      });
    } else {
      await tx.lab_members.update({
        where: { id: existingMembership.id },
        data: {
          role: invite.role,
        },
      });
    }

    await tx.employee_invites.update({
      where: { id: invite.id },
      data: {
        name: payload.name,
        auth_user_id: user.id,
        accepted_at: new Date(),
      },
    });

    return {
      redirect_to: getPostAcceptPath(invite.role),
    };
  });
}
