import type { SessionStatus } from "@/types/session.types";

export const TRANSCRIPT_AVAILABLE_STATUSES: SessionStatus[] = [
  "transcript_ready",
  "ai_notes_generated",
  "ready_for_review",
  "completed",
];

export const REVIEW_READY_STATUSES: SessionStatus[] = [
  "ai_notes_generated",
  "ready_for_review",
  "completed",
];

/** Statuses where server-side pipeline work may still be in flight (queue polling). */
export const PIPELINE_ACTIVE_STATUSES: SessionStatus[] = [
  "recording",
  "uploading",
  "processing",
];

/** Session detail polling while transcript / AI notes may still update. */
export const SESSION_DETAIL_POLL_STATUSES: SessionStatus[] = [
  ...PIPELINE_ACTIVE_STATUSES,
  "transcript_ready",
];

export const isTranscriptAvailable = (status?: SessionStatus | string | null) =>
  Boolean(
    status && TRANSCRIPT_AVAILABLE_STATUSES.includes(status as SessionStatus),
  );

export const isReviewReady = (status?: SessionStatus | string | null) =>
  Boolean(status && REVIEW_READY_STATUSES.includes(status as SessionStatus));

export const isConsultationCompleted = (
  status?: SessionStatus | string | null,
) => status === "completed";

export const isPipelineActive = (status?: SessionStatus | string | null) =>
  Boolean(status && PIPELINE_ACTIVE_STATUSES.includes(status as SessionStatus));

export const canStartRecording = (status?: SessionStatus | string | null) =>
  status !== "completed";

export const isTranscriptPipelineFailed = (session?: {
  status?: string;
  transcriptData?: {
    metadata?: { status?: string; error?: string; aiError?: { retryable?: boolean } };
  };
} | null) => {
  const metadataStatus = session?.transcriptData?.metadata?.status;
  if (metadataStatus === "ai_unavailable") return false;
  return session?.status === "failed" || metadataStatus === "failed";
};

export const isTranscriptAiUnavailable = (session?: {
  transcriptData?: { metadata?: { status?: string } };
} | null) =>
  session?.transcriptData?.metadata?.status === "ai_unavailable";

export const getTranscriptPipelineError = (session?: {
  transcriptData?: {
    metadata?: { error?: string; aiError?: { message?: string } };
  };
} | null) =>
  session?.transcriptData?.metadata?.aiError?.message?.trim() ||
  session?.transcriptData?.metadata?.error?.trim() ||
  null;

export const hasTranscriptContent = (session?: {
  status?: string;
  transcript?: string;
  transcriptData?: { fullText?: string; metadata?: { status?: string } };
} | null) => {
  if (isTranscriptPipelineFailed(session)) return false;
  const fullText =
    session?.transcript?.trim() || session?.transcriptData?.fullText?.trim();
  if (fullText && isTranscriptAvailable(session?.status)) {
    return true;
  }
  const status = session?.transcriptData?.metadata?.status;
  if (status && status !== "completed") return false;
  return Boolean(fullText);
};

/** Doctor can open notes / prescription flow (AI or manual). */
export const canAccessAiNotesWorkflow = (session?: {
  status?: string;
  transcript?: string;
  transcriptData?: { fullText?: string; metadata?: { status?: string } };
} | null) => {
  if (!session) return false;
  if (hasTranscriptContent(session)) return true;
  if (isTranscriptAvailable(session.status)) return true;
  if (isTranscriptAiUnavailable(session)) return true;
  if (
    session.status === "ready_for_review" ||
    session.status === "ai_notes_generated"
  ) {
    return true;
  }
  return false;
};

export const isAiNotesContentReady = (aiNotes?: {
  status?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
} | null) =>
  aiNotes?.status === "completed" &&
  Boolean(
    aiNotes.subjective?.trim() ||
      aiNotes.objective?.trim() ||
      aiNotes.assessment?.trim() ||
      aiNotes.plan?.trim(),
  );

export const shouldPollSessionDetail = (session?: {
  status?: SessionStatus | string;
  transcriptData?: { metadata?: { status?: string } };
  aiNotes?: { status?: string };
} | null) => {
  if (!session?.status) return false;
  if (
    SESSION_DETAIL_POLL_STATUSES.includes(session.status as SessionStatus)
  ) {
    return true;
  }
  if (
    session.status === "processing" ||
    session.transcriptData?.metadata?.status === "processing" ||
    session.transcriptData?.metadata?.status === "pending"
  ) {
    return true;
  }
  if (session.aiNotes?.status === "processing") return true;
  return false;
};
