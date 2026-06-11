import { CaseProcessStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

import { MissingLabMembershipError, getSingleLabMembership } from "../_shared/membership";
import { getAuthenticatedUserId } from "../_shared/request";

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { lab_id } = await getSingleLabMembership(user_id);
    const caseProcesses = await prisma.case_processes.findMany({
      where: {
        status: {
          in: [CaseProcessStatus.READY, CaseProcessStatus.IN_PROGRESS],
        },
        cases: {
          lab_id,
        },
      },
      include: {
        processes: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        cases: {
          select: {
            id: true,
            code: true,
            patient_name: true,
            due_date: true,
            is_urgent: true,
            pending_note: true,
            observations: true,
            customers: {
              select: {
                name: true,
              },
            },
            service_types: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { cases: { due_date: "asc" } },
        { created_at: "asc" },
      ],
    });

    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        description: string;
        owner: string;
        capacity: number;
        targetHours: number;
        queue: Array<{
          id: string;
          caseCode: string;
          patient_name: string;
          customerName: string;
          due_date: string | null;
          restoration: string;
          assignee: string;
          priority: "rush" | "standard";
          notes?: string;
        }>;
      }
    >();

    caseProcesses.forEach((item) => {
      const process = item.processes;
      const existing =
        grouped.get(process.id) ??
        {
          id: process.id,
          name: process.name,
          description: process.description ?? "",
          owner: "Lab",
          capacity: 1,
          targetHours: 0,
          queue: [],
        };

      existing.queue.push({
        id: item.id,
        caseCode: item.cases.code,
        patient_name: item.cases.patient_name,
        customerName: item.cases.customers?.name ?? "No customer",
        due_date: item.cases.due_date?.toISOString() ?? null,
        restoration: item.cases.service_types?.name ?? "No service type",
        assignee: item.assignedTo?.name ?? "Unassigned",
        priority: item.cases.is_urgent ? "rush" : "standard",
        notes: item.cases.pending_note ?? item.cases.observations ?? undefined,
      });
      existing.capacity = Math.max(existing.capacity, existing.queue.length);
      grouped.set(process.id, existing);
    });

    return NextResponse.json({
      data: [...grouped.values()],
      error: null,
      meta: {},
    });
  } catch (error) {
    if (error instanceof MissingLabMembershipError) {
      return NextResponse.json({ error: "No lab membership found for this user." }, { status: 403 });
    }

    console.error("[GET /api/production]", error);
    return NextResponse.json({ error: "Failed to load production queue." }, { status: 500 });
  }
}
