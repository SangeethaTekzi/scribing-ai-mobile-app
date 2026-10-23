import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { workspaceService } from "@/services/workspace.service";
import { workspaceKeys } from "@/services/workspace.queries";
import { logDashboardDiag } from "@/utils/dashboard-diagnostics";
import {
  resolveWorkspaceBootstrap,
  shouldReplaceSelectedWorkspace,
} from "@/utils/workspace-bootstrap.utils";

export const useWorkspaceBootstrap = () => {
  const token = useAuthStore((state) => state.token);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const selectedWorkspaceId = useWorkspaceStore(
    (state) => state.selectedWorkspace?.id ?? null,
  );
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const clearWorkspace = useWorkspaceStore((state) => state.clearWorkspace);
  const setSelectedWorkspace = useWorkspaceStore(
    (state) => state.setSelectedWorkspace,
  );
  const queryClient = useQueryClient();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [hasWorkspaceAccess, setHasWorkspaceAccess] = useState(true);
  const bootstrapCompletedRef = useRef(false);

  useEffect(() => {
    if (!authHydrated || !workspaceHydrated || !token) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;

    const bootstrapWorkspace = async () => {
      const showBlockingLoader = !bootstrapCompletedRef.current;
      if (showBlockingLoader) {
        setIsBootstrapping(true);
      }

      logDashboardDiag("workspace_bootstrap", {
        reason: showBlockingLoader ? "initial" : "token_or_hydration",
        selectedWorkspaceId,
      });

      try {
        const workspaces = await workspaceService.getAll();
        queryClient.setQueryData(workspaceKeys.list(), workspaces);

        if (cancelled) return;

        const currentWorkspace =
          useWorkspaceStore.getState().selectedWorkspace;
        const resolution = resolveWorkspaceBootstrap(
          workspaces,
          currentWorkspace,
        );

        if (resolution.action === "clear") {
          clearWorkspace();
          setHasWorkspaceAccess(false);
          return;
        }

        if (resolution.action === "select") {
          setHasWorkspaceAccess(true);
          if (
            shouldReplaceSelectedWorkspace(
              currentWorkspace,
              resolution.workspace,
            )
          ) {
            setSelectedWorkspace(resolution.workspace);
          }
          return;
        }

        setHasWorkspaceAccess(true);
      } catch {
        if (!useWorkspaceStore.getState().selectedWorkspace) {
          setHasWorkspaceAccess(false);
        }
      } finally {
        if (!cancelled) {
          bootstrapCompletedRef.current = true;
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapWorkspace();

    return () => {
      cancelled = true;
    };
  }, [
    authHydrated,
    clearWorkspace,
    queryClient,
    selectedWorkspaceId,
    setSelectedWorkspace,
    token,
    workspaceHydrated,
  ]);

  return { isBootstrapping, hasWorkspaceAccess };
};
