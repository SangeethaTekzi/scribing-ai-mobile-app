import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiNotesService } from "@/services/ai-notes.service";
import { aiNotesKeys, sessionKeys } from "@/services/query-keys";
import { useSession } from "@/hooks/sessions/useSession";
import {
  canAccessAiNotesWorkflow,
  hasTranscriptContent,
  isAiNotesContentReady,
} from "@/utils/session-status.utils";
import { PIPELINE_POLL_MS } from "@/constants/config";
import type { AiNotes, UpdateAiNotesData } from "@/types/ai-notes.types";
import { aiJobsService, hasActiveAiJob } from "@/services/ai-jobs.service";

export const useAiNotes = (sessionId?: string) => {
  const { data: session } = useSession(sessionId);
  const queryClient = useQueryClient();
  const autoGenerateAttempted = useRef(false);

  const workflowEnabled = canAccessAiNotesWorkflow(session);
  const transcriptReady = hasTranscriptContent(session);

  const aiJobsQuery = useQuery({
    queryKey: [...aiNotesKeys.all, "jobs", sessionId || ""],
    queryFn: () => aiJobsService.list(sessionId!),
    enabled: Boolean(sessionId),
    refetchInterval: (query) =>
      hasActiveAiJob(query.state.data) ? PIPELINE_POLL_MS : false,
  });

  const query = useQuery({
    queryKey: aiNotesKeys.detail(sessionId || ""),
    queryFn: () => aiNotesService.get(sessionId!),
    enabled: Boolean(sessionId) && workflowEnabled,
    staleTime: 5 * 1000,
    refetchInterval: (q) => {
      if (q.state.data?.status === "processing") return PIPELINE_POLL_MS;
      if (hasActiveAiJob(aiJobsQuery.data, "ai_notes")) return PIPELINE_POLL_MS;
      return false;
    },
  });

  const aiNotes =
    (query.data ?? session?.aiNotes) as AiNotes | null | undefined;

  const generate = useMutation({
    mutationFn: (force?: boolean) =>
      aiNotesService.generate(sessionId!, Boolean(force)),
    retry: false,
    onSuccess: async () => {
      if (!sessionId) return;
      await queryClient.invalidateQueries({
        queryKey: aiNotesKeys.detail(sessionId),
      });
      await queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(sessionId),
      });
      await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: [...aiNotesKeys.all, "jobs", sessionId],
      });
    },
  });

  const update = useMutation({
    mutationFn: (data: UpdateAiNotesData) =>
      aiNotesService.update(sessionId!, data),
    onSuccess: (data, variables) => {
      if (!sessionId) return;
      queryClient.setQueryData<AiNotes | null | undefined>(
        aiNotesKeys.detail(sessionId),
        (previous) => {
          if (!previous) return data;
          return {
            ...previous,
            ...data,
            medications:
              variables.medications ?? data.medications ?? previous.medications,
          };
        },
      );
      queryClient.setQueryData(sessionKeys.detail(sessionId), (current: unknown) => {
        if (!current || typeof current !== "object") return current;
        return { ...(current as object), aiNotes: data };
      });
    },
  });

  useEffect(() => {
    autoGenerateAttempted.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !transcriptReady || autoGenerateAttempted.current) return;
    if (isAiNotesContentReady(aiNotes)) return;
    if (aiNotes?.status === "processing" || aiNotes?.status === "failed") return;
    if (generate.isPending) return;

    autoGenerateAttempted.current = true;
    generate.mutate(false);
  }, [
    aiNotes,
    generate,
    sessionId,
    transcriptReady,
  ]);

  const aiNotesJobActive = hasActiveAiJob(aiJobsQuery.data, "ai_notes");

  return {
    ...query,
    session,
    aiNotes,
    aiJobs: aiJobsQuery.data,
    workflowEnabled,
    transcriptReady,
    generate,
    update,
    isGenerating:
      generate.isPending ||
      aiNotes?.status === "processing" ||
      aiNotesJobActive,
  };
};
