import { CaseProcessStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

import { MissingLabMembershipError, getSingleLabMembership } from "../_shared/membership";
import { getAuthenticatedUserId } from "../_shared/request";

function buildPatientDetail(teeth: string | null, serviceName: string) {
  if (!teeth) return null;
  return `${teeth} ${serviceName}`;
}

function resolvePriority(isUrgent: boolean, dueDate: Date | null) {
  if (isUrgent) return "urgent" as const;
  if (!dueDate) return "normal" as const;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 1) return "high" as const;
  if (diffDays >= 5) return "low" as const;
  return "normal" as const;
}

function computeProgress(
  processStatuses: CaseProcessStatus[],
  currentStatus: CaseProcessStatus,
) {
  const totalSteps = processStatuses.length;
  const completedSteps = processStatuses.filter(
    (status) =>
      status === CaseProcessStatus.COMPLETED ||
      status === CaseProcessStatus.SKIPPED,
  ).length;

  const inProgressWeight = currentStatus === CaseProcessStatus.IN_PROGRESS ? 0.5 : 0;
  const progressPercent =
    totalSteps > 0
      ? Math.round(((completedSteps + inProgressWeight) / totalSteps) * 100)
      : 0;

  return {
    completedSteps,
    totalSteps,
    progressPercent,
  };
}

export async function GET() {
  const user_id = await getAuthenticatedUserId();
  if (!user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const membership = await getSingleLabMembership(user_id);
    const caseProcesses = await prisma.case_processes.findMany({
      where: {
        status: {
          in: [CaseProcessStatus.READY, CaseProcessStatus.IN_PROGRESS],
        },
        assigned_lab_member_id:
          membership.role === UserRole.PRODUCTION ? membership.id : undefined,
        cases: {
          lab_id: membership.lab_id,
        },
      },
      include: {
        processes: true,
        case_services: {
          select: {
            id: true,
            service_name_snapshot: true,
            case_processes: {
              select: {
                status: true,
              },
            },
          },
        },
        assignedLabMember: {
          select: {
            id: true,
            users: {
              select: {
                name: true,
              },
            },
          },
        },
        cases: {
          select: {
            id: true,
            code: true,
            patient_name: true,
            teeth: true,
            due_date: true,
            is_urgent: true,
            observations: true,
            customers: {
              select: {
                name: true,
              },
            },
            dentists: {
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
          caseId: string;
          caseProcessId: string;
          workflowStepId: string;
          caseCode: string;
          patientName: string;
          patientDetail: string | null;
          customerName: string;
          dentistName: string | null;
          dueDate: string | null;
          serviceName: string;
          currentStage: string;
          status: "READY" | "IN_PROGRESS" | "COMPLETED" | "LOCKED" | "SKIPPED" | "CANCELLED";
          assignee: string;
          priority: "urgent" | "high" | "normal" | "low";
          progressPercent: number;
          completedSteps: number;
          totalSteps: number;
          notes?: string;
        }>;
      }
    >();

    caseProcesses.forEach((item) => {
      const process = item.processes;
      const serviceName = item.case_services.service_name_snapshot;
      const progress = computeProgress(
        item.case_services.case_processes.map((processItem) => processItem.status),
        item.status,
      );
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
        caseId: item.cases.id,
        caseProcessId: item.id,
        workflowStepId: item.workflow_step_id,
        caseCode: item.cases.code,
        patientName: item.cases.patient_name,
        patientDetail: buildPatientDetail(item.cases.teeth, serviceName),
        customerName: item.cases.customers?.name ?? "No customer",
        dentistName: item.cases.dentists?.name ?? null,
        dueDate: item.cases.due_date?.toISOString() ?? null,
        serviceName,
        currentStage: process.name,
        status: item.status,
        assignee: item.assignedLabMember?.users.name ?? "Unassigned",
        priority: resolvePriority(item.cases.is_urgent, item.cases.due_date),
        progressPercent: progress.progressPercent,
        completedSteps: progress.completedSteps,
        totalSteps: progress.totalSteps,
        notes: item.cases.observations ?? undefined,
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
