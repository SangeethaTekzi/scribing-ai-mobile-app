import type { EncounterType } from "@/types/encounter.types";
import type { Session } from "@/types/session.types";

export const getEncounterType = (session?: Session | null): EncounterType => {
  if (session?.encounter?.encounterType) return session.encounter.encounterType;
  if (session?.visitType === "inpatient") return "IP";
  return "OP";
};

export const canStartNextRoundToday = (session?: Session | null): boolean => {
  if (getEncounterType(session) !== "IP") return false;
  if (session?.encounter?.status === "discharged") return false;
  if (session?.allRoundsCompletedToday) return false;
  if (typeof session?.hasNextRoundToday === "boolean") {
    return session.hasNextRoundToday;
  }
  const schedule = session?.todaySchedule || [];
  return schedule.some((r) => r.status === "pending");
};

export const getIpWorkflowStatusLabel = (session?: Session | null): string | null => {
  if (getEncounterType(session) !== "IP") return null;
  if (session?.encounter?.workflowStatusLabel) {
    return session.encounter.workflowStatusLabel;
  }
  if (
    session?.encounter?.status === "ready_for_discharge" ||
    session?.readyForDischargeWorkflow
  ) {
    return "Ready for discharge (still admitted — not medically discharged)";
  }
  return null;
};
