function normalizeErrorMessage(error: unknown) {
  return String(
    (error as { message?: string } | null | undefined)?.message ?? error ?? "",
  ).toLowerCase();
}

export function isDeletedAtColumnMissingError(error: unknown) {
  const message = normalizeErrorMessage(error);
  return (
    message.includes("deleted_at") &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}
