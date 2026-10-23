type DashboardDiagEvent =
  | "dashboard_render"
  | "queue_fetch"
  | "dashboard_stats_fetch"
  | "workspace_bootstrap"
  | "pull_refresh";

const PREFIX = "[dashboard-diag]";

export function logDashboardDiag(
  event: DashboardDiagEvent,
  detail: Record<string, unknown>,
) {
  if (!__DEV__) return;
  console.info(PREFIX, new Date().toISOString(), event, detail);
}
