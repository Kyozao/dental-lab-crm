import { headers } from "next/headers";
import type { ApiEnvelope } from "@/lib/api/client";

export async function serverApiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";
  const response = await fetch(new URL(path, baseUrl), {
    cache: "no-store",
  });

  return (await response.json()) as ApiEnvelope<T>;
}
