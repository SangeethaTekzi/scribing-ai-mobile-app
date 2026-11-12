import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingScreen, ErrorState } from "@/components/ui/EmptyState";
import { MedicineFormFields } from "@/components/medicines/MedicineFormFields";
import { useMedicine } from "@/hooks/medicines/useMedicines";
import { useMedicineFormState } from "@/hooks/medicines/useMedicineFormState";
import { useMedicineMutations } from "@/hooks/medicines/useMedicineMutations";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useTenantScope } from "@/hooks/useTenantScope";
import {
  formatMedicineCost,
  formatMedicineSubtitle,
  getMedicineId,
} from "@/utils/medicine.utils";
import { validateMedicineForm } from "@/utils/medicineFormValidation.utils";
import {
  getApiErrorMessage,
  isMedicineDuplicateError,
} from "@/utils/apiError.utils";
import { showToast } from "@/store/toast.store";
import { colors, radius, spacing, typography } from "@/theme";
import { useFormScrollIntoView } from "@/hooks/useFormScrollIntoView";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "—"}</Text>
    </View>
  );
}

export default function MedicineDetailScreen() {
  const { medicineId } = useLocalSearchParams<{ medicineId: string }>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const baseScrollBottomPadding = insets.bottom + spacing["5xl"];
  const {
    scrollViewportRef,
    setFieldRef,
    onFocusField,
    onScroll,
    scrollBottomPadding,
  } = useFormScrollIntoView(scrollRef, baseScrollBottomPadding);
  const { organizationId: tenantOrgId } = useTenantScope();
  const { canEditMedicine } = useAccessControl();
  const { updateMedicine } = useMedicineMutations();
  const { data: medicine, isLoading, isError, refetch } = useMedicine(
    medicineId,
  );

  const editable = canEditMedicine();
  const [isEditing, setIsEditing] = useState(false);

  const {
    fields,
    setFields,
    conditionDraft,
    setConditionDraft,
    genericNameTouchedRef,
    addCondition,
    removeCondition,
    resetFromMedicine,
  } = useMedicineFormState(medicine);

  useEffect(() => {
    if (medicine && !isEditing) {
      resetFromMedicine(medicine);
    }
  }, [medicine, isEditing, resetFromMedicine]);

  if (isLoading) return <LoadingScreen message="Loading medicine…" />;
  if (isError || !medicine) {
    return <ErrorState onRetry={refetch} title="Medicine not found" />;
  }

  const orgId = medicine.organizationId || tenantOrgId || "";
  const subtitle = formatMedicineSubtitle(medicine);
  const indications = medicine.indications || [];
  const saving = updateMedicine.isPending;

  const startEditing = () => {
    resetFromMedicine(medicine);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    resetFromMedicine(medicine);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const id = getMedicineId(medicine);
    if (!id) return;

    const result = validateMedicineForm(fields, conditionDraft, orgId);
    if (!result.ok) {
      Alert.alert(result.title, result.message);
      return;
    }

    const { organizationId: _org, ...updateData } = result.payload;

    try {
      await updateMedicine.mutateAsync({ id, data: updateData });
      setIsEditing(false);
      showToast({
        title: "Updated",
        message: "Medicine details saved.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Failed to update medicine.");
      if (isMedicineDuplicateError(message)) {
        showToast({
          title: "Already exists",
          message,
          variant: "error",
          durationMs: 5000,
        });
        return;
      }
      Alert.alert("Could not save", message);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassHeader
        title={isEditing ? "Edit medicine" : "Medicine details"}
        showBack
        subtitle={isEditing ? fields.name || medicine.name : medicine.name}
        right={
          editable && !isEditing ? (
            <Pressable onPress={startEditing} hitSlop={8}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          ) : editable && isEditing ? (
            <Pressable onPress={cancelEditing} hitSlop={8} disabled={saving}>
              <Text style={styles.cancelLink}>Cancel</Text>
            </Pressable>
          ) : null
        }
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View ref={scrollViewportRef} style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: isEditing
                  ? scrollBottomPadding
                  : insets.bottom + spacing["3xl"],
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={isEditing ? "on-drag" : undefined}
            onScroll={isEditing ? onScroll : undefined}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
          {!isEditing ? (
            <>
              <Card style={styles.hero}>
                <Text style={styles.name}>{medicine.name}</Text>
                {subtitle ? (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                ) : null}
                <View
                  style={[
                    styles.statusBadge,
                    medicine.isActive === false && styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      medicine.isActive === false && styles.statusTextInactive,
                    ]}
                  >
                    {medicine.isActive === false ? "Inactive" : "Active"}
                  </Text>
                </View>
              </Card>

              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Product info</Text>
                <DetailRow
                  label="Generic name"
                  value={medicine.genericName || ""}
                />
                <DetailRow
                  label="Brand name"
                  value={medicine.brandName || ""}
                />
                <DetailRow label="Form" value={medicine.form || ""} />
                <DetailRow label="Strength" value={medicine.strength || ""} />
                <DetailRow label="Route" value={medicine.route || ""} />
                <DetailRow
                  label="Cost"
                  value={formatMedicineCost(medicine.cost)}
                />
              </Card>

              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Applicable conditions</Text>
                {indications.length === 0 ? (
                  <Text style={styles.empty}>No conditions listed.</Text>
                ) : (
                  <View style={styles.chipRow}>
                    {indications.map((item) => (
                      <View key={item.id || item.name} style={styles.chip}>
                        <Text style={styles.chipText}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>

              {editable ? (
                <Text style={styles.editHint}>
                  Tap Edit to update this medicine inline.
                </Text>
              ) : null}
            </>
          ) : (
            <Card style={styles.editCard}>
              <MedicineFormFields
                fields={fields}
                setFields={setFields}
                conditionDraft={conditionDraft}
                setConditionDraft={setConditionDraft}
                genericNameTouchedRef={genericNameTouchedRef}
                loading={saving}
                onAddCondition={addCondition}
                onRemoveCondition={removeCondition}
                conditionFieldRef={setFieldRef("conditionDraft")}
                onConditionFocus={onFocusField("conditionDraft")}
              />
            </Card>
          )}
          </ScrollView>
        </View>

        {isEditing ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: insets.bottom + spacing.lg },
            ]}
          >
            <Button
              title={saving ? "Saving…" : "Save changes"}
              onPress={() => void handleSave()}
              disabled={saving}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  editLink: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  cancelLink: {
    ...typography.bodyMedium,
    color: colors.muted,
  },
  hero: { gap: spacing.sm },
  name: { ...typography.title, color: colors.foreground, fontSize: 22 },
  subtitle: { ...typography.body, color: colors.muted },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: "#D1FAE5",
  },
  statusInactive: { backgroundColor: colors.dangerLight },
  statusText: { ...typography.caption, color: "#047857", fontWeight: "600" },
  statusTextInactive: { color: colors.danger },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.foreground },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { ...typography.caption, color: colors.muted, flex: 1 },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.foreground,
    flex: 1.2,
    textAlign: "right",
  },
  empty: { ...typography.body, color: colors.muted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  chipText: { ...typography.caption, color: colors.primary },
  editHint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  editCard: { paddingVertical: spacing.sm },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
