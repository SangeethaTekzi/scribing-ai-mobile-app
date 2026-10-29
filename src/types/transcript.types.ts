export type TranscriptSpeaker = "doctor" | "patient" | "unknown";

export type TranscriptProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker: TranscriptSpeaker;
  language: string;
  confidence: number;
  translation?: string;
}

export interface TranscriptMetadata {
  detectedLanguages: string[];
  primaryLanguage: string;
  isMixedLanguage: boolean;
  averageConfidence: number;
  model: string;
  startedAt?: string;
  completedAt?: string;
  processedAt?: string;
  processingDurationSeconds?: number;
  translationLanguage?: string;
  status: TranscriptProcessingStatus;
  error?: string;
}

export interface TranscriptData {
  fullText: string;
  segments: TranscriptSegment[];
  metadata: TranscriptMetadata;
}

export interface UpdateTranscriptData {
  fullText?: string;
  segments?: TranscriptSegment[];
}

export interface TranscriptSearchResult {
  segmentId: string;
  start: number;
  end: number;
  text: string;
  speaker: TranscriptSpeaker;
  language: string;
  matchIndex: number;
  matchLength: number;
}

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ta: "Tamil",
  hi: "Hindi",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  mr: "Marathi",
  bn: "Bengali",
  gu: "Gujarati",
  pa: "Punjabi",
  mixed: "Mixed (English + Regional)",
};

export const formatLanguage = (code: string) =>
  LANGUAGE_LABELS[code] || code.toUpperCase();

export const formatTimestamp = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const formatConfidence = (value: number) =>
  `${Math.round(value * 100)}%`;
