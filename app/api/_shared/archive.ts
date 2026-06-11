export function archiveData() {
  return {
    is_active: false,
    deleted_at: new Date(),
  };
}

export function restoreData() {
  return {
    is_active: true,
    deleted_at: null,
  };
}

export const activeReferenceWhere = {
  is_active: true,
  deleted_at: null,
} as const;
