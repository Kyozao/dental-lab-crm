export type MessageThreadScope = "assigned" | "all";

export type ListMessageThreadsInput = {
  q?: string;
  scope: MessageThreadScope;
};

type ValidationResult =
  | { success: true; data: ListMessageThreadsInput }
  | { success: false; errors: Record<string, string[]> };

function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function optionalString(value: string | null) {
  if (!value) return undefined;

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseListMessageThreadsInput(
  searchParams: URLSearchParams,
): ValidationResult {
  const errors: Record<string, string[]> = {};
  const scopeParam = optionalString(searchParams.get("scope"));
  const q = optionalString(searchParams.get("q") ?? searchParams.get("search"));

  if (
    scopeParam !== undefined &&
    scopeParam !== "assigned" &&
    scopeParam !== "all"
  ) {
    addError(errors, "scope", "Scope must be assigned or all.");
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      q,
      scope: scopeParam === "all" ? "all" : "assigned",
    },
  };
}
