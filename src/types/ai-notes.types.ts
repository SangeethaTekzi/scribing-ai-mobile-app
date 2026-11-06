export type AiNotesStatus = "pending" | "processing" | "completed" | "failed";

export interface AiNotesMedication {
  medicine: string;
  medicineId?: string;
  medicineNameSnapshot?: string;
  strengthSnapshot?: string;
  brandNameSnapshot?: string;
  formSnapshot?: string;
  /** Client-only; not sent on sign. */
  catalogCostPreview?: number;
  priceAtPrescription?: number;
  morning?: string;
  afternoon?: string;
  night?: string;
  days?: string;
  instructions?: string;
  /** Patient-supplied / out-of-store; not linked to formulary. */
  isExternalSupply?: boolean;
}

export interface AiNotes {
  summary?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  remarks?: string;
  medications?: AiNotesMedication[];
  generatedAt?: string;
  status?: AiNotesStatus;
  error?: string;
}

export interface UpdateAiNotesData {
  summary?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  remarks?: string;
  medications?: AiNotesMedication[];
}

export interface GenerateAiNotesResponse {
  job: import("@/types/ai-job.types").AiJob;
}

export interface VoiceEditSectionChange {
  section: string;
  label: string;
  before: string;
  after: string;
}

export interface VoiceEditVitalsPatch {
  temperature?: number;
  bloodPressure?: {
    systolic?: number;
    diastolic?: number;
  };
  heartRate?: number;
  spo2?: number;
  weight?: number;
}

export interface VoiceEditPreviewResult {
  instructionText: string;
  currentNotes: AiNotes;
  proposedNotes: AiNotes;
  changedSections: string[];
  changes: VoiceEditSectionChange[];
  changeSummary: string;
  vitalsUpdates?: VoiceEditVitalsPatch | null;
}

export interface AcceptVoiceEditPayload {
  proposedNotes: UpdateAiNotesData;
  instructionText: string;
  changedSections: string[];
  changeSummary?: string;
  vitalsUpdates?: VoiceEditVitalsPatch | null;
}

export interface AcceptVoiceEditResponse {
  aiNotes: AiNotes;
  version: number;
  session: import("@/types/session.types").Session;
}
