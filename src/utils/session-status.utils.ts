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

/** Includes transcript_ready for UI that should wait before review actions. */
export const PIPELINE_POLL_STATUSES: SessionStatus[] = [
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
