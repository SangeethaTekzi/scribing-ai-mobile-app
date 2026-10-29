import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { transcriptService } from "@/services/transcript.service";
import { transcriptKeys, sessionKeys } from "@/services/query-keys";
import { useSession } from "@/hooks/sessions/useSession";
import { PIPELINE_POLL_MS } from "@/constants/config";
import {
  canAccessAiNotesWorkflow,
  isTranscriptAvailable,
} from "@/utils/session-status.utils";

const STUCK_REKICK_MS = 3 * 60 * 1000;

export const useTranscript = (sessionId?: string) => {
  const { data: session } = useSession(sessionId);
  const queryClient = useQueryClient();
  const rekickedRef = useRef(false);

  const status = session?.status;
  const metaStatus = session?.transcriptData?.metadata?.status;

  const queryEnabled =
    Boolean(sessionId) &&
    (status === "processing" ||
      status === "uploading" ||
      status === "recording" ||
      isTranscriptAvailable(status) ||
      canAccessAiNotesWorkflow(session));

  const query = useQuery({
    queryKey: transcriptKeys.detail(sessionId || ""),
    queryFn: () => transcriptService.get(sessionId!),
    enabled: queryEnabled,
    staleTime: 5 * 1000,
    refetchInterval: (q) => {
      const meta = q.state.data?.metadata?.status;
      if (
        status === "processing" ||
        status === "uploading" ||
        meta === "processing" ||
        meta === "pending"
      ) {
        return PIPELINE_POLL_MS;
      }
      return false;
    },
  });

  const isProcessing =
    status === "processing" ||
    status === "uploading" ||
    query.data?.metadata?.status === "processing" ||
    query.data?.metadata?.status === "pending";

  useEffect(() => {
    if (!isProcessing) {
      rekickedRef.current = false;
    }
  }, [isProcessing]);

  useEffect(() => {
    if (!sessionId || !isProcessing) return;
    const startedRaw =
      query.data?.metadata?.startedAt ?? session?.updatedAt;
    if (!startedRaw) return;

    const maybeRekick = () => {
      const ageMs = Date.now() - new Date(startedRaw).getTime();
      if (ageMs >= STUCK_REKICK_MS && !rekickedRef.current) {
        rekickedRef.current = true;
        void transcriptService.generate(sessionId).catch(() => {
          rekickedRef.current = false;
        });
      }
    };

    maybeRekick();
    const intervalId = setInterval(maybeRekick, 30_000);
    return () => clearInterval(intervalId);
  }, [
    isProcessing,
    query.data?.metadata?.startedAt,
    session?.updatedAt,
    sessionId,
  ]);

  const prevStatus = useRef(status);
  useEffect(() => {
    if (
      prevStatus.current !== status &&
      isTranscriptAvailable(status) &&
      sessionId
    ) {
      queryClient.invalidateQueries({
        queryKey: transcriptKeys.detail(sessionId),
      });
      queryClient.invalidateQueries({
        queryKey: sessionKeys.detail(sessionId),
      });
    }
    prevStatus.current = status;
  }, [status, sessionId, queryClient]);

  return {
    ...query,
    transcript: query.data,
    isProcessing,
  };
};
