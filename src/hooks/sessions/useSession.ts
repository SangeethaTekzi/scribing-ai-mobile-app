import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/query-keys";
import { shouldPollSessionDetail } from "@/utils/session-status.utils";
import { PIPELINE_POLL_MS } from "@/constants/config";

export const useSession = (sessionId?: string) => {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId || ""),
    queryFn: () => sessionService.getById(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 5 * 1000,
    refetchInterval: (query) =>
      shouldPollSessionDetail(query.state.data) ? PIPELINE_POLL_MS : false,
  });
};

export const useSessions = (filters: Record<string, unknown>, enabled = true) => {
  return useQuery({
    queryKey: sessionKeys.list(filters),
    queryFn: () =>
      sessionService.getAll(
        filters as Parameters<typeof sessionService.getAll>[0],
      ),
    enabled,
    staleTime: 10 * 1000,
  });
};
