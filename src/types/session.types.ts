import type { TranscriptData } from "@/types/transcript.types";
import type { Patient } from "@/types/patient.types";
import type { AiNotes } from "@/types/ai-notes.types";
import type { Encounter, RoundSchedule } from "@/types/encounter.types";

export type SessionType = "consultation" | "follow_up" | "diagnostic" | "other";
export type VisitType = "outpatient" | "inpatient";

export type SessionStatus =
  | "created"
  | "recording"
  | "uploading"
  | "processing"
  | "transcript_ready"
  | "ai_notes_generated"
  | "ready_for_review"
  | "completed"
  | "failed";

export interface SessionUser {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  qualification?: string;
  signature?: string;
  departmentId?: SessionDepartment | string | null;
}

export interface SessionDepartment {
  _id?: string;
  id?: string;
  name?: string;
  departmentCode?: string;
  isActive?: boolean;
}

export interface SessionOrganization {
  _id?: string;
  id?: string;
  name?: string;
  organizationCode?: string;
  logo?: string;
  address?: string;
  contactNumber?: string;
}

export interface LastVisit {
  date: string;
  sessionType?: SessionType | string;
}

export interface PreviousHistoryAiNotes {
  summary?: string;
  subjective?: string;
  assessment?: string;
  plan?: string;
  remarks?: string;
  medications?: AiNotes["medications"];
}

export interface PreviousHistoryItem {
  sessionId: string;
  completedAt?: string | null;
  title: string;
  aiNotes: PreviousHistoryAiNotes;
}

export interface SessionVitals {
  temperature?: number;
  bloodPressure?: {
    systolic?: number;
    diastolic?: number;
  };
  heartRate?: number;
  spo2?: number;
  weight?: number;
}

export interface Session {
  _id?: string;
  id?: string;
  sessionCode: string;
  organizationId: string | SessionOrganization;
  patientId: string | Patient;
  userId: string | SessionUser;
  departmentId?: string | SessionDepartment | null;
  title: string;
  description?: string;
  sessionType: SessionType;
  visitType?: VisitType;
  admittedDate?: string;
  ward?: string;
  bed?: string;
  admissionDay?: number;
  encounter?: Encounter;
  status: SessionStatus;
  audioUrl?: string;
  audioPlaybackUrl?: string | null;
  transcript?: string;
  transcriptData?: TranscriptData;
  aiNotes?: AiNotes;
  vitals?: SessionVitals;
  duration?: number;
  startedAt?: string;
  completedAt?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastVisit?: LastVisit | null;
  previousHistory?: PreviousHistoryItem[];
  todaySchedule?: RoundSchedule[];
  hasNextRoundToday?: boolean;
  allRoundsCompletedToday?: boolean;
}

export interface CreateSessionData {
  title?: string;
  description?: string;
  organizationId: string;
  patientId: string;
  userId: string;
  sessionType: SessionType;
  vitals?: SessionVitals;
}

export interface UpdateSessionData {
  title?: string;
  description?: string;
  sessionType?: SessionType;
  status?: SessionStatus;
  audioUrl?: string;
  transcript?: string;
  duration?: number;
  isActive?: boolean;
  vitals?: SessionVitals;
}

export interface SessionStatusCounts {
  created: number;
  recording: number;
  uploading: number;
  processing: number;
  transcript_ready: number;
  ai_notes_generated: number;
  ready_for_review: number;
  completed: number;
  failed: number;
}

export interface SessionStats {
  total: number;
  activeCount: number;
  statusCounts: SessionStatusCounts;
}

export const getSessionDepartmentId = (
  session?: Session | null,
): string => {
  if (!session?.departmentId) return "";
  if (typeof session.departmentId === "object") {
    return session.departmentId.id || session.departmentId._id || "";
  }
  return session.departmentId;
};

export const getSessionDepartmentName = (
  session?: Session | null,
): string => {
  if (!session?.departmentId) return "";
  if (typeof session.departmentId === "object") {
    return session.departmentId.name || "";
  }
  return "";
};
