const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL ?? ""}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: unknown;
      fields?: unknown;
    } | null;
    const message =
      typeof body?.error === "string" ? body.error : "Request failed";
    const fields =
      body?.fields && typeof body.fields === "object"
        ? (body.fields as Record<string, string[]>)
        : undefined;

    throw new ApiError(message, response.status, fields);
  }

  return response.json();
}
