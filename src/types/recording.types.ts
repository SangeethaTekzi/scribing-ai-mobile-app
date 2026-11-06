export type RecordingState = "idle" | "recording" | "paused" | "stopped";

export interface UploadUrlResponse {
  mode: "s3" | "local";
  uploadUrl: string | null;
  key: string | null;
  audioUrl: string | null;
  contentType?: string;
}

export interface PlaybackUrlResponse {
  playbackUrl: string;
  expiresIn: number | null;
}

export interface CompleteRecordingData {
  key?: string;
  audioUrl?: string;
  duration: number;
  contentType?: string;
}

export interface RecordingAutosaveData {
  elapsedSeconds?: number;
  recordingStatus?: string;
  recordingStartedAt?: string | null;
  transcriptDraft?: string;
  aiNotesDraft?: Record<string, unknown>;
  audioChunkUploadStatus?: string;
}
