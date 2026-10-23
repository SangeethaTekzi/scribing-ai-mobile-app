import type { Patient } from "@/types/patient.types";
import type { Session } from "@/types/session.types";
import type { AuthUser } from "@/types/auth.types";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = [
  "consultation",
  "follow_up",
  "diagnostic",
  "other",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export interface Appointment {
  _id?: string;
  id?: string;
  appointmentCode?: string;
  organizationId?: string | { _id?: string; id?: string; name?: string };
  patientId?: string | Patient;
  doctorId?: string | AuthUser;
  scheduledStart: string;
  scheduledEnd: string;
  appointmentType?: AppointmentType;
  reason?: string;
  notes?: string;
  status: AppointmentStatus;
  sessionId?: string | Session | null;
  checkedInAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckInAppointmentResult {
  appointment: Appointment;
  session: Session;
}

export const getAppointmentId = (appointment: Appointment) =>
  String(appointment.id || appointment._id || "");

export const getAppointmentPatient = (
  appointment: Appointment,
): Patient | null => {
  if (appointment.patientId && typeof appointment.patientId === "object") {
    return appointment.patientId as Patient;
  }
  return null;
};

export const formatAppointmentStatus = (status?: AppointmentStatus) => {
  if (!status) return "—";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
