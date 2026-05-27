export type AppStatusScope =
  | "cloud_save"
  | "cloud_refresh"
  | "analytics_refresh"
  | "history_delete"
  | "migration_health"
  | "game_draft";

export type AppStatusState =
  | "idle"
  | "running"
  | "success"
  | "success_with_warning"
  | "stale"
  | "failed";

export type AppStatusTone = "info" | "success" | "warning" | "danger";

export type AppStatusRecord = {
  id: string;
  scope: AppStatusScope;
  state: AppStatusState;
  title: string;
  detail?: string | null;
  timestamp: number;
};

export type AppStatusDraft = {
  scope: AppStatusScope;
  state: AppStatusState;
  title: string;
  detail?: string | null;
};

export function createAppStatusRecord(
  input: AppStatusDraft,
  now: number = Date.now(),
): AppStatusRecord {
  return {
    id: `${input.scope}:${input.state}:${now}`,
    scope: input.scope,
    state: input.state,
    title: input.title,
    detail: input.detail ?? null,
    timestamp: now,
  };
}

export function getAppStatusTone(status: Pick<AppStatusRecord, "state">): AppStatusTone {
  switch (status.state) {
    case "success":
      return "success";
    case "success_with_warning":
    case "stale":
      return "warning";
    case "failed":
      return "danger";
    case "idle":
    case "running":
    default:
      return "info";
  }
}
