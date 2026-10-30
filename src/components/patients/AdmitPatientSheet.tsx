import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { encounterService } from "@/services/encounter.service";
import { sessionKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTimeLocalInput, parseDateTimeLocalInput } from "@/utils/datetime.utils";
import { colors, spacing, typography } from "@/theme";

interface AdmitPatientSheetProps {
  visible: boolean;
  sessionId: string;
  onClose: () => void;
}

export function AdmitPatientSheet({
  visible,
  sessionId,
  onClose,
}: AdmitPatientSheetProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [ward, setWard] = useState("");
  const [bed, setBed] = useState("");
  const [reason, setReason] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [admittedAtLocal, setAdmittedAtLocal] = useState(() =>
    formatDateTimeLocalInput(),
  );

  useEffect(() => {
    if (!visible) return;
    setAdmittedAtLocal(formatDateTimeLocalInput());
  }, [visible]);

  const admitMutation = useMutation({
    mutationFn: () => {
      const parsed = parseDateTimeLocalInput(admittedAtLocal);
      return encounterService.admitPatient(sessionId, {
        ward: ward.trim(),
        bed: bed.trim(),
        reason: reason.trim() || undefined,
        attendingDoctorId: String(user?.id || user?._id || ""),
        admittedAt: (parsed ?? new Date()).toISOString(),
        isEmergency,
      });
    },
    onSuccess: async () => {
      onClose();
      setWard("");
      setBed("");
      setReason("");
      setIsEmergency(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: sessionKeys.detail(sessionId),
        }),
        queryClient.invalidateQueries({ queryKey: sessionKeys.lists() }),
      ]);
      Alert.alert("Admitted", "Patient admitted — encounter is now IP.");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      Alert.alert(
        "Admit failed",
        error?.response?.data?.message || "Failed to admit patient.",
      );
    },
  });

  const canSubmit =
    ward.trim().length > 0 &&
    bed.trim().length > 0 &&
    Boolean(user?.id || user?._id);

  return (
    <BottomSheet visible={visible} title="Admit Patient" onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.help}>
          Convert this consultation to an inpatient encounter with ward and bed.
        </Text>
        <Input
          label="Ward"
          value={ward}
          onChangeText={setWard}
          placeholder="e.g. A1"
        />
        <Input
          label="Bed"
          value={bed}
          onChangeText={setBed}
          placeholder="e.g. 12"
        />
        <Input
          label="Reason (optional)"
          value={reason}
          onChangeText={setReason}
        />
        <Input
          label="Admission date & time"
          value={admittedAtLocal}
          onChangeText={setAdmittedAtLocal}
          placeholder="YYYY-MM-DDTHH:mm"
          hint="Local date and time (defaults to now when opened)"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Emergency admission</Text>
          <Switch value={isEmergency} onValueChange={setIsEmergency} />
        </View>
        <Button
          title="Admit Patient"
          loading={admitMutation.isPending}
          disabled={!canSubmit}
          onPress={() => admitMutation.mutate()}
        />
        <Button title="Cancel" variant="outline" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  help: { ...typography.body, color: colors.muted },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  switchLabel: { ...typography.body, color: colors.foreground },
});
