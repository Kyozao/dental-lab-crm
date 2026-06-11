export type RegistryActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: { id: string };
};

export type RegistryEntity =
  | "customers"
  | "dentists"
  | "components"
  | "block-types"
  | "service-types"
  | "milling-drills";

export type RegistryCustomerOption = {
  id: string;
  name: string;
};
