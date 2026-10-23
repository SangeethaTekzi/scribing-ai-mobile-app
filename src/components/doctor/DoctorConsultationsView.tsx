import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth.store";
import { useTenantScope } from "@/hooks/useTenantScope";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useAppointments } from "@/hooks/appointments/useAppointments";
import { useAppointmentMutations } from "@/hooks/appointments/useAppointmentMutations";
import {
  getPatientFromQueueItem,
  getQueueItemKey,
  useDoctorQueue,
} from "@/hooks/doctor/useDoctorQueue";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/query-keys";
import {
  getAppointmentId,
  getAppointmentPatient,
  type Appointment,
} from "@/types/appointment.types";
import type { DoctorQueueItem } from "@/types/encounter.types";
import {
  getDoctorDisplayName,
} from "@/types/auth.types";
import { getSessionDepartmentName } from "@/types/session.types";
import {
  getPatientAge,
  getPatientFullName,
  getPatientInitials,
} from "@/utils/patient.utils";
import {
  getConsultationBriefPath,
  getDoctorWorkspacePath,
} from "@/utils/doctor-navigation.utils";
import { getDefaultDoctorDateRange } from "@/utils/doctor-dashboard-date-range";
import { getGreeting } from "@/utils/date.utils";
import { useDoctorDashboardStats } from "@/hooks/doctor/useDoctorDashboardStats";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { DoctorDashboardSummary } from "@/components/doctor/DoctorDashboardSummary";
import { logDashboardDiag } from "@/utils/dashboard-diagnostics";
import { shouldShowDoctorQueueLoading } from "@/utils/doctor-queue-loading.utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { colors, spacing, typography } from "@/theme";

const SEEN_STATUSES = new Set([
  "completed",
  "transcript_ready",
  "ai_notes_generated",
  "ready_for_review",
]);

export function DoctorConsultationsView() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { workspaceName } = useTenantScope();
  const { canCreatePatient, canViewAppointments, canCheckInAppointment } =
    useAccessControl();
  const dashboardRange = useMemo(() => getDefaultDoctorDateRange(), []);
  const {
    data: dashboardStats,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useDoctorDashboardStats(dashboardRange);
  const {
    items,
    doctorId,
    organizationId,
    isLoading,
    isScopeReady,
    isError,
    refetch,
  } = useDoctorQueue();
  const { checkInAppointment } = useAppointmentMutations();
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const { appointments: todayAppointments } = useAppointments({
    doctorId,
    organizationId,
    today: true,
    limit: 50,
    enabled:
      canViewAppointments() && Boolean(doctorId) && Boolean(organizationId),
  });

  const scheduledToday = useMemo(
    () =>
      todayAppointments.filter((apt) => {
        if (apt.status !== "scheduled") return false;
        const patient = getAppointmentPatient(apt);
        const patientId = String(patient?._id || patient?.id || "");
        if (!patientId) return true;
        return !items.some((item) => {
          const queuePatientId = String(
            item.patient?._id || item.patient?.id || "",
          );
          return queuePatientId === patientId;
        });
      }),
    [todayAppointments, items],
  );

  const stats = useMemo(() => {
    const queueCount = items.length + scheduledToday.length;
    const seenCount = items.filter((item) =>
      SEEN_STATUSES.has(item.session?.status || ""),
    ).length;
    /** Still recording / not yet at notes review — excludes ready_for_review (counts as Seen). */
    const pending = items.filter((item) => {
      const status = item.session?.status || "";
      if (status === "completed") return false;
      if (SEEN_STATUSES.has(status)) return false;
      return true;
    }).length;
    return {
      queueCount,
      pending,
      seenCount,
    };
  }, [items, scheduledToday.length]);

  const notesAwaitingReview = useMemo(
    () =>
      items.filter((item) => item.session?.status === "ready_for_review")
        .length,
    [items],
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchDashboard()]);
  }, [refetch, refetchDashboard]);

  const { isUserRefreshing, handleRefresh: onPullRefresh } =
    usePullToRefresh(handleRefresh);

  useEffect(() => {
    logDashboardDiag("dashboard_render", {
      dashboardLoading,
      queueLoading: isLoading,
      scopeReady: isScopeReady,
      itemCount: items.length,
      hasDashboardStats: Boolean(dashboardStats),
    });
  }, [
    dashboardLoading,
    dashboardStats,
    isLoading,
    isScopeReady,
    items.length,
  ]);

  const clinicDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const navigateToBrief = (sessionId: string) => {
    router.push(getConsultationBriefPath(sessionId) as never);
  };

  const navigateToWorkspace = (sessionId: string, status?: string) => {
    router.push(getDoctorWorkspacePath(sessionId, status) as never);
  };

  const openBrief = async (item: DoctorQueueItem) => {
    const key = getQueueItemKey(item);
    if (item.sessionId) {
      navigateToBrief(item.sessionId);
      return;
    }
    if (item.kind === "ip_encounter" && item.encounterId) {
      if (item.allRoundsCompletedToday) {
        Alert.alert("Rounds complete", "All rounds for today are done.");
        return;
      }
      try {
        setOpeningKey(key);
        const data = await encounterService.startRoundForEncounter(
          item.encounterId,
          { roundScheduleId: item.nextRoundScheduleId || undefined },
        );
        const nextId = String(data.session?._id || data.session?.id || "");
        await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        if (nextId) navigateToBrief(nextId);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Failed to open today's round.";
        Alert.alert("Unable to open", message);
      } finally {
        setOpeningKey(null);
      }
    }
  };

  const openWorkspace = async (item: DoctorQueueItem) => {
    const key = getQueueItemKey(item);
    if (item.sessionId) {
      navigateToWorkspace(item.sessionId, item.session?.status);
      return;
    }
    if (item.kind === "ip_encounter" && item.encounterId) {
      if (item.allRoundsCompletedToday) {
        Alert.alert("Rounds complete", "All rounds for today are done.");
        return;
      }
      try {
        setOpeningKey(key);
        const data = await encounterService.startRoundForEncounter(
          item.encounterId,
          { roundScheduleId: item.nextRoundScheduleId || undefined },
        );
        const nextId = String(data.session?._id || data.session?.id || "");
        await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
        if (nextId) navigateToWorkspace(nextId, data.session?.status);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Failed to open today's round.";
        Alert.alert("Unable to open", message);
      } finally {
        setOpeningKey(null);
      }
    }
  };

  const handleCheckIn = async (appointment: Appointment) => {
    const id = getAppointmentId(appointment);
    setCheckingInId(id);
    try {
      const result = await checkInAppointment.mutateAsync(id);
      const sessionId = String(
        result.session?.id || result.session?._id || "",
      );
      if (sessionId) {
        navigateToWorkspace(sessionId, result.session?.status || "created");
      }
    } finally {
      setCheckingInId(null);
    }
  };

  const showLoading = shouldShowDoctorQueueLoading(
    isScopeReady,
    isLoading,
    items.length,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isUserRefreshing}
            onRefresh={onPullRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.doctorName}>{getDoctorDisplayName(user)}</Text>
            <Text style={styles.clinicMeta}>
              {clinicDateLabel}
              {workspaceName ? ` · ${workspaceName}` : ""}
            </Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/profile")}>
            <Avatar
              name={`${user?.firstName || ""} ${user?.lastName || ""}`}
              uri={user?.profilePicture}
              size={52}
            />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="In clinic" value={String(stats.queueCount)} />
          <StatCard
            label="In progress"
            value={String(stats.pending)}
          />
          <StatCard label="Seen" value={String(stats.seenCount)} />
        </View>

        <DoctorDashboardSummary
          stats={dashboardStats}
          notesAwaitingReview={notesAwaitingReview}
          isLoading={dashboardLoading}
          isError={dashboardError}
        />

        <Text style={styles.sectionTitle}>Today&apos;s consultations</Text>

        {showLoading ? (
          <>
            <SkeletonCard />
            <View style={{ height: spacing.md }} />
            <SkeletonCard />
          </>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 && scheduledToday.length === 0 ? (
          <EmptyState
            icon="medkit-outline"
            title="No consultations today"
            description="Scheduled patients will appear here after check-in, or add a walk-in patient."
          />
        ) : (
          <>
            {scheduledToday.map((apt) => {
              const patient = getAppointmentPatient(apt);
              if (!patient) return null;
              const aptId = getAppointmentId(apt);
              return (
                <QueueRow
                  key={`apt-${aptId}`}
                  name={getPatientFullName(patient)}
                  meta={[
                    getPatientAge(patient) !== null
                      ? `${getPatientAge(patient)} yrs`
                      : null,
                    apt.reason?.trim() || "Scheduled",
                    "Not checked in",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  initials={getPatientInitials(patient)}
                  primaryLabel="Check in"
                  primaryLoading={checkingInId === aptId}
                  onPrimary={
                    canCheckInAppointment()
                      ? () => handleCheckIn(apt)
                      : undefined
                  }
                />
              );
            })}

            {items.map((item) => {
              const patient = getPatientFromQueueItem(item);
              if (!patient) return null;
              const key = getQueueItemKey(item);
              const subtitleParts = [
                getSessionDepartmentName(item.session),
                item.encounterType,
                item.ward && item.bed ? `${item.ward}/${item.bed}` : null,
                item.nextRoundLabel,
              ].filter(Boolean);

              return (
                <QueueRow
                  key={key}
                  name={getPatientFullName(patient)}
                  meta={subtitleParts.join(" · ") || "Consultation"}
                  initials={getPatientInitials(patient)}
                  status={item.session?.status}
                  primaryLabel="Open"
                  primaryLoading={openingKey === key}
                  onPrimary={() => openWorkspace(item)}
                  secondaryLabel="Brief"
                  onSecondary={() => openBrief(item)}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      {canCreatePatient() ? (
        <FloatingActionButton
          icon="person-add"
          onPress={() => router.push("/create-patient" as never)}
        />
      ) : null}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.statCard} elevated={false}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function QueueRow({
  name,
  meta,
  initials,
  status,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  primaryLoading,
  secondaryHidden,
}: {
  name: string;
  meta: string;
  initials: string;
  status?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryLoading?: boolean;
  secondaryHidden?: boolean;
}) {
  return (
    <Card style={styles.queueCard}>
      <View style={styles.queueTop}>
        <Avatar name={initials} size={48} />
        <View style={styles.queueText}>
          <Text style={styles.queueName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.queueMeta} numberOfLines={2}>
            {meta}
          </Text>
          {status ? (
            <Text style={styles.queueStatus}>{status.replace(/_/g, " ")}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.queueActions}>
        {!secondaryHidden && onSecondary && secondaryLabel ? (
          <Button
            variant="outline"
            size="sm"
            title={secondaryLabel}
            onPress={onSecondary}
            fullWidth={false}
            style={styles.queueBtn}
          />
        ) : null}
        {onPrimary ? (
          <Button
            size="sm"
            title={primaryLabel}
            loading={primaryLoading}
            onPress={onPrimary}
            fullWidth={false}
            style={styles.queueBtn}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["4xl"] + 72,
    gap: spacing.sm,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  greetingText: { flex: 1, gap: 2 },
  greeting: { ...typography.caption, color: colors.muted },
  doctorName: { ...typography.title, color: colors.foreground, fontSize: 26 },
  clinicMeta: { ...typography.caption, color: colors.muted, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: "flex-start", gap: 4 },
  statValue: { ...typography.heading, color: colors.foreground },
  statLabel: { ...typography.caption, color: colors.muted },
  sectionTitle: {
    ...typography.heading,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  queueCard: { marginBottom: spacing.sm, gap: spacing.md },
  queueTop: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  queueText: { flex: 1, gap: 2 },
  queueName: { ...typography.heading, color: colors.foreground },
  queueMeta: { ...typography.caption, color: colors.muted },
  queueStatus: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  queueActions: { flexDirection: "row", gap: spacing.sm },
  queueBtn: { flex: 1 },
});
