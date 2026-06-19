import { UserRole, type UserRole as UserRoleValue } from "@/generated/prisma/enums";

export type EmployeeRole =
  | typeof UserRole.ADMIN
  | typeof UserRole.MANAGER
  | typeof UserRole.PRODUCTION;

export type Employee = {
  id: string;
  lab_member_id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  is_active: boolean;
  created_at: string;
  processes: EmployeeProcess[];
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

export type EmployeeListResult = {
  employees: Employee[];
  currentUserRole: UserRoleValue | null;
  canInviteEmployees: boolean;
};

export type EmployeeDetailResult = {
  employee: Employee;
  currentUserRole: UserRoleValue | null;
  canAssignProcesses: boolean;
  canEditRole: boolean;
};
