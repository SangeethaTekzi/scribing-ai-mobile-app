import type { Patient } from "@/types/patient.types";
import type { Session } from "@/types/session.types";

export type EncounterType = "OP" | "IP";

export type EncounterStatus =
  | "in_consultation"
  | "follow_up"
  | "admitted"
  | "under_treatment"
  | "ready_for_discharge"
  | "discharged"
  | "cancelled"
  | "completed"
  | "closed"
  | "active";

export type RoundType =
  | "morning"
  | "afternoon"
  | "night"
  | "custom"
  | "consultation";

export type DispositionType = "home" | "follow_up" | "admit";

export type DischargeDisposition =
  | "home"
  | "follow_up"
  | "transfer"
  | "lama"
  | "other";

export type RoundScheduleStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  | "missed"
  | "cancelled";

export interface EncounterDoctor {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  qualification?: string;
}

export interface AdmissionInfo {
  admittedAt: string;
  ward: string;
  bed: string;
  reason?: string;
  attendingDoctorId?: string;
  attendingDoctor?: EncounterDoctor | null;
  isEmergency?: boolean;
}

export interface DischargeInfo {
  dischargedAt: string;
  disposition: DischargeDisposition;
  notes?: string;
  followUpDate?: string;
  summaryGenerated?: boolean;
}

export interface Encounter {
  _id?: string;
  id?: string;
  encounterCode: string;
  organizationId: string;
  patientId: string;
  encounterType: EncounterType;
  status: EncounterStatus;
  followUpDate?: string;
  admission?: AdmissionInfo;
  discharge?: DischargeInfo;
  admissionDay?: number;
  workflowStatusLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoundSchedule {
  id: string;
  _id?: string;
  encounterId: string;
  organizationId?: string;
  date?: string;
  dateKey: string;
  roundNumber: number;
  roundName: string;
  roundType: RoundType | string;
  status: RoundScheduleStatus;
  scheduledTime?: string | null;
  consultationId?: string | null;
  assignedDoctorId?: string | null;
  completedDoctorId?: string | null;
  assignedDoctor?: EncounterDoctor | null;
  completedDoctor?: EncounterDoctor | null;
  completedAt?: string | null;
  isCurrent?: boolean;
  isDone?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EncounterRound {
  sessionId: string;
  title: string;
  roundType: RoundType | string;
  roundLabel: string;
  admissionDay?: number;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  isToday: boolean;
  isCurrent: boolean;
  isDone: boolean;
  doctor?: EncounterDoctor | null;
}

export interface AdmissionTimelineItem {
  sessionId: string | null;
  roundScheduleId?: string;
  label: string;
  admissionDay: number;
  dateKey?: string;
  roundType?: RoundType | string;
  roundLabel?: string;
  roundNumber?: number;
  status: string;
  consultationStatus?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  doctor?: EncounterDoctor | null;
  isCurrent: boolean;
}

export interface EncounterBundle {
  encounter: Encounter;
  rounds: EncounterRound[];
  todayRounds: EncounterRound[];
  todaySchedule?: RoundSchedule[];
  nextPendingRound?: RoundSchedule | null;
  hasNextRoundToday?: boolean;
  allRoundsCompletedToday?: boolean;
  admissionTimeline: AdmissionTimelineItem[];
  currentSessionId: string;
}

export interface AdmitPatientData {
  ward: string;
  bed: string;
  reason?: string;
  attendingDoctorId: string;
  admittedAt?: string;
  isEmergency?: boolean;
}

export interface DischargePatientData {
  dischargedAt?: string;
  disposition: DischargeDisposition;
  notes?: string;
  followUpDate?: string;
  generateSummary?: boolean;
}

export interface CreateRoundData {
  roundType?: RoundType;
  roundLabel?: string;
  roundScheduleId?: string;
  assignedDoctorId?: string;
}

export interface DoctorQueueItem {
  kind: "op_session" | "ip_encounter";
  sessionId: string | null;
  encounterId: string | null;
  patient: Patient | null;
  session?: Session | null;
  encounter?: Encounter | null;
  encounterType: EncounterType;
  status?: string;
  admissionDay?: number | null;
  ward?: string | null;
  bed?: string | null;
  nextRoundLabel?: string | null;
  nextRoundType?: RoundType | string | null;
  nextRoundStatus?: RoundScheduleStatus | null;
  nextRoundScheduleId?: string | null;
  allRoundsCompletedToday?: boolean;
  readyForDischargeWorkflow?: boolean;
  todaySchedule?: RoundSchedule[];
  hasTodaySession?: boolean;
  isEmergency?: boolean;
}
