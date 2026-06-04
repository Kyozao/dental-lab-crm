import type {
  RegistryActionState,
  RegistryEntity,
} from "@/features/registry/types";

export async function createRegistryEntity(
  _entity: RegistryEntity,
  _formData: FormData,
): Promise<RegistryActionState> {
  void _entity;
  void _formData;
  return {
    success: true,
    message: "Mock registry changes are disabled for now.",
  };
}

export async function updateRegistryEntity(
  _entity: RegistryEntity,
  id: string,
  _formData: FormData,
): Promise<RegistryActionState> {
  void _entity;
  void _formData;
  return {
    success: true,
    message: "Mock registry changes are disabled for now.",
    data: { id },
  };
}

export async function deleteRegistryEntity(_entity: RegistryEntity, _id: string) {
  void _entity;
  void _id;
  return;
}
