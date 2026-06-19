import type { CaseCommentItem, CaseStatusValue } from "@/features/cases/types";

export type MessageThreadScope = "assigned" | "all";

export type MessageThreadSummary = {
  caseId: string;
  caseCode: string;
  patientName: string;
  patientDetail: string | null;
  customerId: string | null;
  customerName: string | null;
  currentStatus: CaseStatusValue;
  currentProcessName: string | null;
  currentProcessStatus: string | null;
  currentProcessAssigneeId: string | null;
  currentProcessAssigneeName: string | null;
  serviceLabel: string | null;
  latestMessageId: string | null;
  latestMessagePreview: string | null;
  latestMessageAt: string;
  unreadCount: number;
  canReply: boolean;
};

export type MessageThreadDetail = MessageThreadSummary & {
  comments: CaseCommentItem[];
};

export type MessageThreadsPayload = {
  scope: MessageThreadScope;
  canViewAll: boolean;
  threads: MessageThreadSummary[];
};
