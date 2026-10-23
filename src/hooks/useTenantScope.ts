import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { resolveOrganizationId } from "@/utils/tenant-scope.utils";

export const useTenantScope = () => {
  const user = useAuthStore((state) => state.user);
  const selectedWorkspace = useWorkspaceStore(
    (state) => state.selectedWorkspace,
  );

  const organizationId = resolveOrganizationId(selectedWorkspace, user);

  return {
    organizationId,
    workspaceId: selectedWorkspace?.id || "",
    workspaceName:
      selectedWorkspace?.organizationName ||
      selectedWorkspace?.name ||
      user?.organizationName ||
      "",
  };
};
