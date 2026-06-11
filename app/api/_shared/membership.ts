import { prisma } from "@/lib/prisma";

export class MissingLabMembershipError extends Error {
  constructor(user_id: string) {
    super(`User ${user_id} does not have a lab membership.`);
    this.name = "MissingLabMembershipError";
  }
}

export async function getLabMember(user_id: string) {
  const membership = await prisma.lab_members.findUnique({
    where: { user_id },
    select: {
      lab_id: true,
    },
  });

  if (!membership) {
    throw new MissingLabMembershipError(user_id);
  }

  return {
    lab_id: membership.lab_id,
  };
}

export const getSingleLabMembership = getLabMember;
