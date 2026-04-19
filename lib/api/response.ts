export function apiSuccess<T>(
  data: T,
  options?: {
    status?: number;
    meta?: Record<string, unknown>;
  },
) {
  return Response.json(
    {
      data,
      error: null,
      meta: options?.meta ?? {},
    },
    {
      status: options?.status ?? 200,
    },
  );
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    {
      data: null,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      meta: {},
    },
    {
      status,
    },
  );
}
