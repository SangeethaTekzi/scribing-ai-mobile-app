import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen, ErrorState } from "@/components/ui/EmptyState";
import { useAiNotes } from "@/hooks/ai-notes/useAiNotes";
import { useSession } from "@/hooks/sessions/useSession";
import type { AiNotes, AiNotesMedication } from "@/types/ai-notes.types";
import {
  bootstrapManualConsultationDraft,
  createLocalManualDraft,
} from "@/utils/consultation-workflow.utils";
import { canAccessAiNotesWorkflow } from "@/utils/session-status.utils";
import {
  createEmptyMedication,
  findClinicalCompletenessIssue,
  getApiErrorMessage,
  normalizeMedicationsForEditing,
} from "@/utils/prescriptionMedication.utils";
import { MedicineSearchSheet } from "@/components/consultation/MedicineSearchSheet";
import { colors, radius, spacing, typography } from "@/theme";

export default function AiNotesScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const insets = useSafeAreaInsets();
  const { data: session } = useSession(sessionId);
  const {
    aiNotes,
    isLoading,
    isError,
    refetch,
    generate,
    update,
    isGenerating,
    workflowEnabled,
    transcriptReady,
  } = useAiNotes(sessionId);
  const [bootstrappingManual, setBootstrappingManual] = useState(false);
  const [draft, setDraft] = useState<AiNotes | null>(null);
  const [highlightMedIndex, setHighlightMedIndex] = useState<number | null>(
    null,
  );
  const scrollRef = useRef<ScrollView>(null);
  const medLayoutRef = useRef<
    Record<number, { top: number; instructionY: number }>
  >({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [medicineSheetOpen, setMedicineSheetOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToMedicationInstructions = useCallback((index: number) => {
    setTimeout(() => {
      const layout = medLayoutRef.current[index];
      if (!layout) {
        scrollRef.current?.scrollToEnd({ animated: true });
        return;
      }
      const targetY = layout.top + layout.instructionY - 96;
      scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
    }, 150);
  }, []);

  useEffect(() => {
    if (!aiNotes) return;
    setDraft((previous) => {
      const normalized = {
        ...aiNotes,
        medications: normalizeMedicationsForEditing(
          aiNotes.medications,
          aiNotes.plan,
        ),
      };
      if (!previous) return normalized;
      if (previous.generatedAt !== aiNotes.generatedAt) return normalized;
      return previous;
    });
  }, [aiNotes]);

  if (!workflowEnabled && !canAccessAiNotesWorkflow(session)) {
    return (
      <View style={styles.screen}>
        <GlassHeader title="AI Notes" showBack />
        <View style={styles.center}>
          <Text style={styles.waitHint}>
            Finish upload and processing before editing notes.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading || (isGenerating && transcriptReady && !draft)) {
    return <LoadingScreen message="Generating AI notes…" />;
  }

  if (isError) return <ErrorState onRetry={refetch} />;

  if (!draft) {
    return (
      <View style={styles.screen}>
        <GlassHeader title="Clinical Notes" showBack />
        <View style={styles.center}>
          <Button
            title="Generate AI Notes"
            loading={generate.isPending}
            onPress={() => generate.mutate(false)}
          />
          <View style={styles.manualGap} />
          <Button
            title="Write notes manually (no AI)"
            variant="outline"
            loading={bootstrappingManual}
            onPress={async () => {
              if (!sessionId) return;
              try {
                setBootstrappingManual(true);
                await bootstrapManualConsultationDraft(sessionId);
                await refetch();
                setDraft(createLocalManualDraft());
              } catch (error) {
                Alert.alert(
                  "Could not start manual draft",
                  getApiErrorMessage(error, "Try again."),
                );
              } finally {
                setBootstrappingManual(false);
              }
            }}
          />
        </View>
      </View>
    );
  }

  const setField = (key: keyof AiNotes, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const addMedication = (medication: AiNotesMedication) => {
    setHighlightMedIndex(null);
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            medications: [...(prev.medications || []), medication],
          }
        : prev,
    );
  };

  const removeMedication = (index: number) => {
    setHighlightMedIndex(null);
    setDraft((prev) => {
      if (!prev) return prev;
      const medications = [...(prev.medications || [])];
      medications.splice(index, 1);
      return { ...prev, medications };
    });
  };

  const saveAndPreview = async () => {
    const medications =
      normalizeMedicationsForEditing(draft.medications, draft.plan) ||
      draft.medications ||
      [];
    const workingDraft = { ...draft, medications };
    setDraft(workingDraft);

    const issue = findClinicalCompletenessIssue(medications);
    if (issue) {
      setHighlightMedIndex(issue.index);
      const layout = medLayoutRef.current[issue.index];
      if (layout) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, layout.top - 24),
          animated: true,
        });
      }
      Alert.alert(
        "Prescription incomplete",
        `${issue.message}\n\nFill M / A / N (dose) and Days for each medicine, then tap Preview again.`,
      );
      return;
    }

    setHighlightMedIndex(null);

    try {
      await update.mutateAsync({
        summary: workingDraft.summary,
        subjective: workingDraft.subjective,
        objective: workingDraft.objective,
        assessment: workingDraft.assessment,
        plan: workingDraft.plan,
        remarks: workingDraft.remarks,
        medications,
      });
      router.push(`/consultation/${sessionId}/preview`);
    } catch (error) {
      Alert.alert(
        "Save failed",
        getApiErrorMessage(error, "Could not update AI notes."),
      );
    }
  };

  const footerClearance = 120;
  const scrollBottomPad =
    insets.bottom + footerClearance + keyboardHeight + spacing.xl;

  return (
    <View style={styles.screen}>
      <GlassHeader title="AI Notes" showBack subtitle="Editable clinical notes" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
        <NoteField
          label="Chief Complaint / HPI (SOAP Subjective)"
          value={draft.subjective || ""}
          onChangeText={(v) => setField("subjective", v)}
        />
        <NoteField
          label="Examination (SOAP Objective)"
          value={draft.objective || ""}
          onChangeText={(v) => setField("objective", v)}
        />
        <NoteField
          label="Assessment / Diagnosis"
          value={draft.assessment || ""}
          onChangeText={(v) => setField("assessment", v)}
        />
        <NoteField
          label="Treatment Plan"
          value={draft.plan || ""}
          onChangeText={(v) => setField("plan", v)}
        />
        <NoteField
          label="Advice / Follow-up"
          value={draft.remarks || ""}
          onChangeText={(v) => setField("remarks", v)}
        />

        <View style={styles.prescriptionHeader}>
          <Text style={styles.sectionTitle}>Prescription</Text>
          <View style={styles.prescriptionActions}>
            <Button
              title="Search"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => setMedicineSheetOpen(true)}
            />
            <Button
              title="Add row"
              variant="outline"
              size="sm"
              fullWidth={false}
              onPress={() => addMedication(createEmptyMedication())}
            />
          </View>
        </View>
        {(draft.medications || []).length === 0 ? (
          <Text style={styles.empty}>
            No medicines yet. Search the catalog or add a row to type a
            prescription.
          </Text>
        ) : (
          draft.medications!.map((med, index) => (
            <View
              key={`${med.medicine}-${index}`}
              onLayout={(event) => {
                const prev = medLayoutRef.current[index] || {
                  top: 0,
                  instructionY: 0,
                };
                medLayoutRef.current[index] = {
                  ...prev,
                  top: event.nativeEvent.layout.y,
                };
              }}
            >
              <MedicationEditor
                medication={med}
                highlighted={highlightMedIndex === index}
                onRemove={() => removeMedication(index)}
                onInstructionsFocus={() => scrollToMedicationInstructions(index)}
                onInstructionsLayout={(instructionY) => {
                  const prev = medLayoutRef.current[index] || {
                    top: 0,
                    instructionY: 0,
                  };
                  medLayoutRef.current[index] = {
                    ...prev,
                    instructionY,
                  };
                }}
                onChange={(next) => {
                  setHighlightMedIndex(null);
                  const medications = [...(draft.medications || [])];
                  medications[index] = next;
                  setDraft({ ...draft, medications });
                }}
              />
            </View>
          ))
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.footerRow}>
          <View style={styles.footerBtn}>
            <Button
              title="Regenerate"
              variant="outline"
              loading={generate.isPending}
              onPress={() => generate.mutate(true)}
            />
          </View>
          <View style={styles.footerBtn}>
            <Button
              title="Preview"
              loading={update.isPending}
              onPress={saveAndPreview}
            />
          </View>
        </View>
      </View>

      <MedicineSearchSheet
        visible={medicineSheetOpen}
        onClose={() => setMedicineSheetOpen(false)}
        onSelect={addMedication}
      />
    </View>
  );
}

function NoteField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <Card style={styles.fieldCard}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        style={styles.input}
        textAlignVertical="top"
      />
    </Card>
  );
}

function MedicationEditor({
  medication,
  highlighted,
  onRemove,
  onInstructionsFocus,
  onInstructionsLayout,
  onChange,
}: {
  medication: AiNotesMedication;
  highlighted?: boolean;
  onRemove?: () => void;
  onInstructionsFocus?: () => void;
  onInstructionsLayout?: (yWithinCard: number) => void;
  onChange: (med: AiNotesMedication) => void;
}) {
  return (
    <Card
      style={[styles.medCard, highlighted ? styles.medCardHighlight : null]}
      elevated={false}
    >
      <View style={styles.medNameRow}>
        <TextInput
          value={medication.medicine}
          onChangeText={(medicine) => onChange({ ...medication, medicine })}
          style={[styles.medName, { flex: 1 }]}
          placeholder="Medicine name"
          placeholderTextColor={colors.mutedLight}
        />
        {onRemove ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.removeMed}>
            <Text style={styles.removeMedText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.medRow}>
        {(
          [
            { key: "morning" as const, label: "M" },
            { key: "afternoon" as const, label: "A" },
            { key: "night" as const, label: "N" },
            { key: "days" as const, label: "Days" },
          ] as const
        ).map(({ key, label }) => (
          <View key={key} style={styles.medDoseWrap}>
            <Text style={styles.medDoseLabel}>{label}</Text>
            <TextInput
              value={medication[key] || ""}
              onChangeText={(value) => onChange({ ...medication, [key]: value })}
              style={[
                styles.medDose,
                key === "days" && !medication.days?.trim()
                  ? styles.medDoseRequired
                  : null,
              ]}
              placeholder={key === "days" ? "3" : "0"}
              keyboardType={key === "days" ? "number-pad" : "default"}
              placeholderTextColor={colors.mutedLight}
            />
          </View>
        ))}
      </View>
      <View
        onLayout={(event) => {
          onInstructionsLayout?.(event.nativeEvent.layout.y);
        }}
      >
        <TextInput
          value={medication.instructions || ""}
          onChangeText={(instructions) =>
            onChange({ ...medication, instructions })
          }
          onFocus={onInstructionsFocus}
          multiline
          style={styles.medInstructions}
          placeholder="Instructions"
          placeholderTextColor={colors.mutedLight}
          textAlignVertical="top"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md },
  center: { flex: 1, justifyContent: "center", padding: spacing.xl },
  manualGap: { height: spacing.md },
  waitHint: { ...typography.body, color: colors.muted, textAlign: "center" },
  sectionTitle: {
    ...typography.heading,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  prescriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  prescriptionActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  empty: { ...typography.body, color: colors.muted },
  fieldCard: { gap: spacing.sm },
  label: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  input: {
    ...typography.body,
    color: colors.foreground,
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  medCard: { gap: spacing.sm, marginBottom: spacing.sm },
  medCardHighlight: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  medNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  removeMed: { paddingTop: 4 },
  removeMedText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "600",
  },
  medName: {
    ...typography.bodyMedium,
    color: colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  medRow: { flexDirection: "row", gap: spacing.sm },
  medDoseWrap: { flex: 1, gap: 2 },
  medDoseLabel: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  medDose: {
    ...typography.caption,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    textAlign: "center",
    minHeight: 36,
  },
  medDoseRequired: {
    borderColor: colors.warning,
  },
  medInstructions: {
    ...typography.caption,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: 72,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.glass,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerRow: { flexDirection: "row", gap: spacing.md },
  footerBtn: { flex: 1 },
});
