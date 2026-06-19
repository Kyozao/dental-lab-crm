"use client";

import { api } from "@/lib/api";

import type {
  MessageThreadDetail,
  MessageThreadScope,
  MessageThreadsPayload,
} from "../types";

export const MESSAGE_THREADS_QUERY_KEY = "message-threads";
export const MESSAGE_THREAD_QUERY_KEY = "message-thread";

type MessageThreadsResponse = {
  data?: MessageThreadsPayload;
  error?: string | null;
  fields?: Record<string, string[]>;
};

type MessageThreadResponse = {
  data?: MessageThreadDetail;
  error?: string | null;
  fields?: Record<string, string[]>;
};

type MessageThreadReadResponse = {
  data?: {
    caseId: string;
    lastReadCommentId: string | null;
    lastReadAt: string;
  };
  error?: string | null;
  fields?: Record<string, string[]>;
};

function buildThreadsEndpoint(query: {
  q?: string;
  scope?: MessageThreadScope;
}) {
  const params = new URLSearchParams();

  if (query.q) {
    params.set("q", query.q);
  }

  if (query.scope) {
    params.set("scope", query.scope);
  }

  const queryString = params.toString();
  return queryString ? `/api/messages?${queryString}` : "/api/messages";
}

export function getMessageThreadsQueryKey(query: {
  q?: string;
  scope?: MessageThreadScope;
}) {
  return [
    MESSAGE_THREADS_QUERY_KEY,
    query.q ?? "",
    query.scope ?? "assigned",
  ] as const;
}

export function getMessageThreadQueryKey(caseId: string | null) {
  return [MESSAGE_THREAD_QUERY_KEY, caseId] as const;
}

export const messagesApi = {
  async getThreads(query: { q?: string; scope?: MessageThreadScope }) {
    const response = await api<MessageThreadsResponse>(buildThreadsEndpoint(query));
    if (!response.data) {
      throw new Error("Message threads response was empty.");
    }

    return response.data;
  },

  async getThread(caseId: string) {
    const response = await api<MessageThreadResponse>(`/api/messages/${caseId}`);
    if (!response.data) {
      throw new Error("Message thread response was empty.");
    }

    return response.data;
  },

  async markThreadRead(caseId: string) {
    const response = await api<MessageThreadReadResponse>(
      `/api/messages/${caseId}/read`,
      {
        method: "POST",
      },
    );
    if (!response.data) {
      throw new Error("Message read response was empty.");
    }

    return response.data;
  },
};
