import { UserRole, type UserRole as UserRoleValue } from "@/generated/prisma/enums";
import type {
  CaseStatus,
  CasePriority,
  CaseProcessHistoryEventType,
  CaseProcessStatus,
} from "@/generated/prisma/enums";

export type EmployeeRole =
  | typeof UserRole.ADMIN
  | typeof UserRole.MANAGER
  | typeof UserRole.PRODUCTION;

export type EmployeeStatus = "ACTIVE" | "PENDING";

export type Employee = {
  id: string;
  lab_member_id: string | null;
  user_id: string | null;
  name: string;
  email: string;
  role: UserRoleValue;
  status: EmployeeStatus;
  is_active: boolean;
  created_at: string;
  processes: EmployeeProcess[];
};

export type EmployeeInviteDetails = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  lab_name: string;
};

export type CreateEmployeePayload = {
  name: string;
  email: string;
  role: EmployeeRole;
};

export type EmployeeProcess = {
  id: string;
  name: string;
};

export type EmployeeProductivityAssignment = {
  processId: string;
  processName: string;
};

export type EmployeeWeekdayCapacity = {
  id: string;
  dayOfWeek: number;
  availableMinutes: number;
};

export type EmployeeScheduleException = {
  id: string;
  exceptionDate: string;
  availableMinutes: number;
  reason: string | null;
};

export type EmployeeWorkloadDay = {
  date: string;
  plannedMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  isOverbooked: boolean;
};

export type EmployeeScheduleProfile = {
  processAssignments: EmployeeProductivityAssignment[];
  weekdayCapacities: EmployeeWeekdayCapacity[];
  exceptions: EmployeeScheduleException[];
  workloadSummary: EmployeeWorkloadDay[];
};

export type EmployeeDashboardSummary = {
  activeAssignedCases: number;
  dueTodayAssignedCases: number;
  delayedAssignedCases: number;
  completedAssignedProcessesThisWeek: number;
  workloadPercentNext14Days: number | null;
  avgTurnaroundDaysCompletedThisMonth: number | null;
};

export type EmployeeAssignedCaseItem = {
  caseId: string;
  caseCode: string;
  patientName: string;
  customerName: string | null;
  processId: string;
  processName: string;
  dueDate: string | null;
  priority: CasePriority | null;
  status: CaseProcessStatus;
  caseStatus: CaseStatus;
};

export type EmployeeTodayScheduleItem = {
  date: string;
  caseProcessId: string;
  caseCode: string;
  patientName: string;
  processName: string;
  plannedMinutes: number;
};

export type EmployeeProcessPermissionItem = {
  processId: string;
  processName: string;
  isPrimary: boolean;
  isAllowed: boolean;
  productivityPointsPerHour: number | null;
};

export type EmployeeActivityItem = {
  id: string;
  type: "process" | "comment";
  createdAt: string;
  caseId: string;
  caseCode: string;
  patientName: string;
  processName: string | null;
  eventType: CaseProcessHistoryEventType | null;
  commentPreview: string | null;
};

export type EmployeeDashboardCapacity = {
  scheduledMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  overbookedDayCount: number;
  workloadSummary: EmployeeWorkloadDay[];
};

export type EmployeeDashboard = {
  summary: EmployeeDashboardSummary;
  assignedCases: EmployeeAssignedCaseItem[];
  todaySchedule: EmployeeTodayScheduleItem[];
  processPermissions: EmployeeProcessPermissionItem[];
  recentActivity: EmployeeActivityItem[];
  capacity: EmployeeDashboardCapacity;
};

export type EmployeeListResult = {
  employees: Employee[];
  currentUserRole: UserRoleValue | null;
  canInviteEmployees: boolean;
};

export type EmployeeDetailResult = {
  employee: Employee;
  scheduleProfile: EmployeeScheduleProfile | null;
  dashboard: EmployeeDashboard | null;
  currentUserRole: UserRoleValue | null;
  canAssignProcesses: boolean;
  canEditRole: boolean;
  canManageCapacity: boolean;
};
