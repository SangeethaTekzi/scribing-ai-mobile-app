import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/query-keys";
import type { DoctorQueueItem } from "@/types/encounter.types";
import type { Session } from "@/types/session.types";
import type { Patient } from "@/types/patient.types";
import { isPipelineActive } from "@/utils/session-status.utils";
import { resolveOrganizationId } from "@/utils/tenant-scope.utils";
import { logDashboardDiag } from "@/utils/dashboard-diagnostics";
import { getLocalDayKey } from "@/utils/date.utils";
import { PIPELINE_POLL_MS } from "@/constants/config";

export const getSessionId = (session: Session) =>
  String(session._id || session.id || "");

export const getQueueItemKey = (item: DoctorQueueItem) =>
  item.sessionId ||
  item.encounterId ||
  `${item.encounterType}-${item.patient?._id || item.patient?.id || "unknown"}`;

export const getPatientFromQueueItem = (
  item: DoctorQueueItem,
): Patient | null => item.patient || null;

export const getPatientFromSession = (session: Session): Patient | null => {
  if (typeof session.patientId === "object" && session.patientId) {
    return session.patientId as Patient;
  }
  return null;
};

export async function resolveQueueSessionId(
  item: DoctorQueueItem,
): Promise<string | null> {
  if (item.sessionId) return item.sessionId;

  if (item.kind === "ip_encounter" && item.encounterId) {
    if (item.allRoundsCompletedToday) return null;
    const data = await encounterService.startRoundForEncounter(
      item.encounterId,
      { roundScheduleId: item.nextRoundScheduleId || undefined },
    );
    return String(data.session?._id || data.session?.id || "") || null;
  }

  return null;
}

export const useDoctorQueue = () => {
  const user = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state._hasHydrated);
  const workspaceHydrated = useWorkspaceStore((state) => state._hasHydrated);
  const selectedWorkspace = useWorkspaceStore(
    (state) => state.selectedWorkspace,
  );
  const organizationId = resolveOrganizationId(selectedWorkspace, user);

  const doctorId = String(user?.id || user?._id || "");
  const scopedOrganizationId = organizationId;
  const todayKey = getLocalDayKey();

  const isScopeReady =
    authHydrated &&
    workspaceHydrated &&
    Boolean(doctorId) &&
    Boolean(scopedOrganizationId);

  const query = useQuery({
    queryKey: [
      ...sessionKeys.lists(),
      "doctor-queue",
      doctorId,
      scopedOrganizationId,
      todayKey,
    ],
    queryFn: async () => {
      logDashboardDiag("queue_fetch", {
        doctorId,
        organizationId: scopedOrganizationId,
        todayKey,
      });
      const data = await encounterService.getDoctorQueue({
        organizationId: scopedOrganizationId,
        doctorId,
      });
      return data;
    },
    enabled: isScopeReady,
    staleTime: 5 * 1000,
    retry: 1,
    refetchInterval: (queryResult) => {
      const items = queryResult.state.data?.items || [];
      const hasActivePipeline = items.some((item) =>
        item.session ? isPipelineActive(item.session.status) : false,
      );
      return hasActivePipeline ? PIPELINE_POLL_MS : false;
    },
  });

  const items = query.data?.items || [];

  const sessions: Session[] = items
    .filter((item) => item.sessionId)
    .map((item) => {
      if (item.session && typeof item.session === "object") {
        return {
          ...item.session,
          _id: item.sessionId || undefined,
          patientId: item.patient || item.session.patientId,
          visitType: item.encounterType === "IP" ? "inpatient" : "outpatient",
          ward: item.ward || undefined,
          bed: item.bed || undefined,
          admissionDay: item.admissionDay || undefined,
          encounter: item.encounter || undefined,
        } as Session;
      }
      return {
        _id: item.sessionId || undefined,
        patientId: item.patient || "",
        status: (item.status as Session["status"]) || "created",
        visitType: item.encounterType === "IP" ? "inpatient" : "outpatient",
        ward: item.ward || undefined,
        bed: item.bed || undefined,
        admissionDay: item.admissionDay || undefined,
        encounter: item.encounter || undefined,
        title: "",
        sessionCode: "",
        organizationId: scopedOrganizationId,
        userId: doctorId,
        sessionType: "consultation",
      } as Session;
    });

  return {
    ...query,
    doctorId,
    organizationId: scopedOrganizationId,
    isScopeReady,
    items,
    sessions,
    allSessions: sessions,
    getSessionId,
    getQueueItemKey,
    getPatientFromSession,
    getPatientFromQueueItem,
  };
};
