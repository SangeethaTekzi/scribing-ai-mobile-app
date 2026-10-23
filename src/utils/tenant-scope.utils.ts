import type { AuthUser } from "@/types/auth.types";
import { getUserOrganizationId } from "@/types/auth.types";
import type { Workspace } from "@/types/workspace.types";

/** Organization id for API calls — never use workspace.id as a fallback. */
export function resolveOrganizationId(
  selectedWorkspace: Workspace | null | undefined,
  user: AuthUser | null | undefined,
): string {
  return (
    selectedWorkspace?.organizationId ||
    getUserOrganizationId(user) ||
    ""
  );
}
