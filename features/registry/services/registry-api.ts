import type {
  RegistryActionState,
  RegistryEntity,
} from "@/features/registry/types";
import {
  getApiErrorMessage,
  getApiFieldErrors,
  parseApiEnvelope,
} from "@/lib/api/client";

export async function createRegistryEntity(
  entity: RegistryEntity,
  formData: FormData,
): Promise<RegistryActionState> {
  const payload = Object.fromEntries(formData.entries());
  const response = await fetch(`/api/registry/${entity}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await parseApiEnvelope<{ id: string }>(response);

  if (!response.ok || !result?.data) {
    return {
      success: false,
      message: getApiErrorMessage(result, `Failed to create ${entity}.`),
      errors: getApiFieldErrors(result),
    };
  }

  return {
    success: true,
    message: "Created successfully.",
    data: { id: result.data.id },
  };
}

export async function updateRegistryEntity(
  entity: RegistryEntity,
  id: string,
  formData: FormData,
): Promise<RegistryActionState> {
  const payload = Object.fromEntries(formData.entries());
  const response = await fetch(`/api/registry/${entity}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await parseApiEnvelope<{ id?: string }>(response);

  if (!response.ok) {
    return {
      success: false,
      message: getApiErrorMessage(result, `Failed to update ${entity}.`),
      errors: getApiFieldErrors(result),
    };
  }

  return {
    success: true,
    message: "Updated successfully.",
    data: { id: result?.data?.id ?? id },
  };
}

export async function deleteRegistryEntity(entity: RegistryEntity, id: string) {
  const response = await fetch(`/api/registry/${entity}/${id}`, {
    method: "DELETE",
  });

  const result = await parseApiEnvelope<unknown>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(result, `Failed to delete ${entity}.`));
  }
}
