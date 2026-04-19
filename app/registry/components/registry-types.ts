export type RegistryActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: { id: string };
};

export type RegistryEntity =
  | "clinics"
  | "dentists"
  | "components"
  | "block-types"
  | "service-types"
  | "milling-drills";

export type RegistryClinicOption = {
  id: string;
  name: string;
};
