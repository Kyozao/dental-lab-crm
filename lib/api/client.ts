export type ApiEnvelope<T> = {
  data: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | null;
  meta?: Record<string, unknown>;
};

export async function parseApiEnvelope<T>(
  response: Response,
): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

export function getApiErrorMessage<T>(
  envelope: ApiEnvelope<T> | null,
  fallback: string,
) {
  return envelope?.error?.message ?? fallback;
}

export function getApiFieldErrors<T>(
  envelope: ApiEnvelope<T> | null,
): Record<string, string[]> | undefined {
  const details = envelope?.error?.details;

  if (
    typeof details === "object" &&
    details !== null &&
    "fields" in details &&
    typeof (details as { fields?: unknown }).fields === "object"
  ) {
    return (details as { fields?: Record<string, string[]> }).fields;
  }

  return undefined;
}