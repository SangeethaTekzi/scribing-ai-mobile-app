import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { encounterService } from "@/services/encounter.service";
import { sessionService } from "@/services/session.service";
import { sessionKeys } from "@/services/query-keys";
import type { DispositionType } from "@/types/encounter.types";
import type { Session } from "@/types/session.types";
import {
  canStartNextRoundToday,
  getEncounterType,
} from "@/utils/encounter.utils";
import { getDoctorWorkspacePath } from "@/utils/doctor-navigation.utils";
import { colors, spacing, typography } from "@/theme";

type IpAction = "finish" | "next_round" | "discharge";

interface SaveConsultationSheetProps {
  visible: boolean;
  onClose: () => void;
  session: Session;
  sessionId: string;
  onCompleted: () => void;
}

export function SaveConsultationSheet({
  visible,
  onClose,
  session,
  sessionId,
  onCompleted,
}: SaveConsultationSheetProps) {
  const queryClient = useQueryClient();
  const isIp = getEncounterType(session) === "IP";
  const hasNextRound = canStartNextRoundToday(session);
  const [opAction, setOpAction] = useState<DispositionType>("home");
  const [ipAction, setIpAction] = useState<IpAction>("finish");
  const [followUpDate, setFollowUpDate] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setOpAction("home");
    setIpAction(hasNextRound ? "next_round" : "finish");
    setFollowUpDate("");
  }, [visible, hasNextRound]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: sessionKeys.detail(sessionId),
    });
    await queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
  };

  const handleConfirm = async () => {
    try {
      setPending(true);
      if (!isIp) {
        if (opAction === "admit") {
          onClose();
          Alert.alert(
            "Admit patient",
            "Use the patient details screen to admit as inpatient.",
          );
          return;
        }
        await encounterService.setDisposition(sessionId, opAction, {
          followUpDate:
            opAction === "follow_up" ? followUpDate || undefined : undefined,
        });
        await invalidate();
        onClose();
        onCompleted();
        return;
      }

      if (ipAction === "next_round" && hasNextRound) {
        const nextSchedule = session.todaySchedule?.find(
          (r) => r.status === "pending",
        );
        const data = await encounterService.createNextRound(sessionId, {
          roundScheduleId: nextSchedule?.id,
          roundType: nextSchedule?.roundType as
            | "morning"
            | "afternoon"
            | "night"
            | undefined,
        });
        await invalidate();
        onClose();
        const nextId = String(data.session?._id || data.session?.id || "");
        if (nextId) {
          router.replace(getDoctorWorkspacePath(nextId, "created") as never);
        }
        return;
      }

      if (ipAction === "discharge") {
        await encounterService.dischargePatient(sessionId, {
          disposition: "home",
        });
        await invalidate();
        onClose();
        onCompleted();
        return;
      }

      if (ipAction === "finish") {
        await sessionService.updateStatus(sessionId, "completed");
        await invalidate();
        onClose();
        onCompleted();
        return;
      }

      onClose();
      onCompleted();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save consultation.";
      Alert.alert("Save failed", message);
    } finally {
      setPending(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={isIp ? "Round saved" : "Consultation saved"}
      onClose={onClose}
    >
      <View style={styles.body}>
        <Text style={styles.description}>
          {isIp ? "Choose the next step for this inpatient." : "Next action"}
        </Text>

        {!isIp ? (
          <>
            <Radio
              label="Send home"
              selected={opAction === "home"}
              onPress={() => setOpAction("home")}
            />
            <Radio
              label="Follow-up"
              selected={opAction === "follow_up"}
              onPress={() => setOpAction("follow_up")}
            />
            <Radio
              label="Admit as inpatient"
              selected={opAction === "admit"}
              onPress={() => setOpAction("admit")}
            />
            {opAction === "follow_up" ? (
              <TextInput
                value={followUpDate}
                onChangeText={setFollowUpDate}
                placeholder="Follow-up date (YYYY-MM-DD)"
                placeholderTextColor={colors.mutedLight}
                style={styles.input}
              />
            ) : null}
          </>
        ) : (
          <>
            <Radio
              label="Finish round"
              selected={ipAction === "finish"}
              onPress={() => setIpAction("finish")}
            />
            {hasNextRound ? (
              <Radio
                label="Start next round"
                selected={ipAction === "next_round"}
                onPress={() => setIpAction("next_round")}
              />
            ) : null}
            <Radio
              label="Discharge patient"
              selected={ipAction === "discharge"}
              onPress={() => setIpAction("discharge")}
            />
          </>
        )}

        <Button title="Continue" loading={pending} onPress={handleConfirm} />
      </View>
    </BottomSheet>
  );
}

function Radio({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.radioRow} onPress={onPress}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.xl, gap: spacing.md },
  description: { ...typography.body, color: colors.muted },
  radioRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: { ...typography.body, color: colors.foreground, flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.foreground,
  },
});
