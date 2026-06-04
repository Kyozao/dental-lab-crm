import { getApiErrorMessage, parseApiEnvelope } from "@/lib/api/client";

async function parseErrorMessage(response: Response, fallback: string) {
  const result = await parseApiEnvelope<unknown>(response);
  return getApiErrorMessage(result, fallback);
}

export async function createMilling(payload: unknown) {
  const response = await fetch("/api/production", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to create milling."));
  }
}

export async function updateMilling(id: string, payload: unknown) {
  const response = await fetch(`/api/production/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to update milling."));
  }
}

export async function deleteMilling(id: string) {
  const response = await fetch(`/api/production/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Failed to delete milling."));
  }
}
