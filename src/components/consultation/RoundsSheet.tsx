import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/query-keys";
import type { RoundSchedule } from "@/types/encounter.types";
import type { Session } from "@/types/session.types";
import {
  canStartNextRoundToday,
  getEncounterType,
  getIpWorkflowStatusLabel,
} from "@/utils/encounter.utils";
import { colors, spacing, typography } from "@/theme";

interface RoundsSheetProps {
  visible: boolean;
  sessionId: string;
  session?: Session | null;
  onClose: () => void;
}

export function RoundsSheet({
  visible,
  sessionId,
  session,
  onClose,
}: RoundsSheetProps) {
  const queryClient = useQueryClient();
  const isIp = getEncounterType(session) === "IP";
  const schedule: RoundSchedule[] = session?.todaySchedule ?? [];
  const hasPending = schedule.some((r) => r.status === "pending");
  const allDone = Boolean(session?.allRoundsCompletedToday);

  const openRound = useMutation({
    mutationFn: async (round: RoundSchedule) => {
      if (round.consultationId) {
        return { sessionId: round.consultationId };
      }
      const data = await encounterService.createNextRound(sessionId, {
        roundScheduleId: round.id,
        roundType: round.roundType as "morning" | "afternoon" | "night",
      });
      return {
        sessionId: String(data.session?._id || data.session?.id || ""),
      };
    },
    onSuccess: async ({ sessionId: nextId }) => {
      await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      onClose();
      if (nextId && nextId !== sessionId) {
        router.replace(`/consultation/${nextId}` as never);
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "Round",
        error?.response?.data?.message || "Failed to open round.",
      );
    },
  });

  const addNextRound = useMutation({
    mutationFn: () => {
      const next = schedule.find((r) => r.status === "pending");
      return encounterService.createNextRound(sessionId, {
        roundScheduleId: next?.id,
        roundType: next?.roundType as "morning" | "afternoon" | "night" | undefined,
      });
    },
    onSuccess: async (data) => {
      const nextId = data.session?._id || data.session?.id;
      await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      onClose();
      if (nextId) {
        router.replace(`/consultation/${nextId}` as never);
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "Round",
        error?.response?.data?.message || "Failed to start round.",
      );
    },
  });

  const statusLabel = (round: RoundSchedule) => {
    if (round.status === "completed") return "Completed";
    if (round.status === "in_progress" || round.isCurrent) return "In progress";
    if (round.status === "cancelled") return "Cancelled";
    if (round.status === "skipped") return "Skipped";
    if (round.status === "missed") return "Missed";
    return "Pending";
  };

  return (
    <BottomSheet visible={visible} title="Today's rounds" onClose={onClose}>
      <View style={styles.content}>
        {!isIp ? (
          <Text style={styles.hint}>
            Rounds are available after the patient is admitted (IP).
          </Text>
        ) : null}

        {isIp && schedule.length === 0 ? (
          <Text style={styles.hint}>No round schedule for today yet.</Text>
        ) : null}

        {schedule.map((round) => {
          const isActive =
            round.isCurrent ||
            round.consultationId === sessionId ||
            round.status === "in_progress";

          return (
            <Pressable
              key={round.id}
              style={[styles.row, isActive && styles.rowActive]}
              disabled={openRound.isPending}
              onPress={() => openRound.mutate(round)}
            >
              <View style={styles.rowText}>
                <Text style={styles.roundName}>{round.roundName}</Text>
                <Text style={styles.roundStatus}>{statusLabel(round)}</Text>
              </View>
              {openRound.isPending ? (
                <ActivityIndicator color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}

        {isIp && allDone ? (
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>
              All three rounds for today are completed.
            </Text>
            {getIpWorkflowStatusLabel(session) ? (
              <Text style={styles.workflowText}>
                {getIpWorkflowStatusLabel(session)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isIp && hasPending && canStartNextRoundToday(session) ? (
          <Pressable
            style={styles.addButton}
            disabled={addNextRound.isPending}
            onPress={() => addNextRound.mutate()}
          >
            {addNextRound.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.addButtonText}>Start next pending round</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.lg },
  hint: { ...typography.body, color: colors.mutedForeground },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  rowText: { flex: 1 },
  roundName: { ...typography.bodyMedium, color: colors.foreground },
  roundStatus: { ...typography.caption, color: colors.mutedForeground },
  doneBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: spacing.md,
  },
  doneText: { ...typography.body, color: colors.foreground },
  workflowText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  addButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  addButtonText: { ...typography.bodyMedium, color: colors.primary },
});
