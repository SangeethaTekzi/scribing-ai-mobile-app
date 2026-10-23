import type { Workspace } from "@/types/workspace.types";
import {
  getDefaultWorkspace,
  isWorkspaceAccessible,
} from "@/utils/workspace.utils";

export type WorkspaceBootstrapResolution =
  | { action: "none" }
  | { action: "clear"; hasAccess: false }
  | { action: "select"; workspace: Workspace; hasAccess: true };

/**
 * Pure resolution for post-fetch workspace bootstrap (used by useWorkspaceBootstrap).
 */
export function resolveWorkspaceBootstrap(
  workspaces: Workspace[],
  selectedWorkspace: Workspace | null,
): WorkspaceBootstrapResolution {
  const defaultWorkspace = getDefaultWorkspace(workspaces);

  if (!defaultWorkspace) {
    return { action: "clear", hasAccess: false };
  }

  if (!isWorkspaceAccessible(selectedWorkspace, workspaces)) {
    return { action: "select", workspace: defaultWorkspace, hasAccess: true };
  }

  return { action: "none" };
}

export function shouldReplaceSelectedWorkspace(
  current: Workspace | null,
  next: Workspace,
): boolean {
  if (!current) return true;
  return current.id !== next.id;
}
