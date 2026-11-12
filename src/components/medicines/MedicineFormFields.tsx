import React, { type MutableRefObject, type Ref } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  MEDICINE_FORMS,
  MEDICINE_ROUTES,
} from "@/types/medicine.types";
import type { MedicineFormState } from "@/utils/medicineForm.utils";
import { colors, radius, spacing, typography } from "@/theme";

interface MedicineFormFieldsProps {
  fields: MedicineFormState;
  setFields: React.Dispatch<React.SetStateAction<MedicineFormState>>;
  conditionDraft: string;
  setConditionDraft: (value: string) => void;
  genericNameTouchedRef: MutableRefObject<boolean>;
  loading?: boolean;
  onAddCondition: () => void;
  onRemoveCondition: (condition: string) => void;
  conditionFieldRef?: Ref<View>;
  onConditionFocus?: () => void;
}

export function MedicineFormFields({
  fields,
  setFields,
  conditionDraft,
  setConditionDraft,
  genericNameTouchedRef,
  loading = false,
  onAddCondition,
  onRemoveCondition,
  conditionFieldRef,
  onConditionFocus,
}: MedicineFormFieldsProps) {
  return (
    <View style={styles.wrap}>
      <Input
        label="Medicine name *"
        placeholder="e.g. Paracetamol"
        value={fields.name}
        editable={!loading}
        onChangeText={(name) =>
          setFields((current) => ({
            ...current,
            name,
            genericName: genericNameTouchedRef.current
              ? current.genericName
              : name,
          }))
        }
      />
      <Input
        label="Generic name"
        placeholder="e.g. Paracetamol"
        value={fields.genericName}
        editable={!loading}
        onChangeText={(genericName) => {
          genericNameTouchedRef.current = true;
          setFields((current) => ({ ...current, genericName }));
        }}
      />
      <Input
        label="Brand name"
        placeholder="e.g. Calpol"
        value={fields.brandName}
        editable={!loading}
        onChangeText={(brandName) =>
          setFields((current) => ({ ...current, brandName }))
        }
      />

      <Text style={styles.fieldLabel}>Form</Text>
      <View style={styles.chipRow}>
        {MEDICINE_FORMS.map((item) => (
          <Pressable
            key={item}
            disabled={loading}
            style={[
              styles.chip,
              fields.dosageForm === item && styles.chipSelected,
            ]}
            onPress={() =>
              setFields((current) => ({ ...current, dosageForm: item }))
            }
          >
            <Text
              style={[
                styles.chipText,
                fields.dosageForm === item && styles.chipTextSelected,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Input
        label="Strength"
        placeholder="e.g. 500 mg"
        value={fields.strength}
        editable={!loading}
        onChangeText={(strength) =>
          setFields((current) => ({ ...current, strength }))
        }
      />

      <Text style={styles.fieldLabel}>Route</Text>
      <View style={styles.chipRow}>
        {MEDICINE_ROUTES.map((item) => (
          <Pressable
            key={item}
            disabled={loading}
            style={[styles.chip, fields.route === item && styles.chipSelected]}
            onPress={() =>
              setFields((current) => ({ ...current, route: item }))
            }
          >
            <Text
              style={[
                styles.chipText,
                fields.route === item && styles.chipTextSelected,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Input
        label="Cost (₹)"
        placeholder="e.g. 25"
        keyboardType="decimal-pad"
        value={fields.cost}
        editable={!loading}
        hint="Optional; numeric value in rupees."
        onChangeText={(cost) => setFields((current) => ({ ...current, cost }))}
      />

      <View style={styles.conditionSection}>
        <Text style={styles.conditionLabel}>Applicable conditions *</Text>
        <View style={styles.conditionRow}>
          <View ref={conditionFieldRef} style={styles.conditionInput}>
            <Input
              label="Condition"
              placeholder="e.g. Fever"
              value={conditionDraft}
              editable={!loading}
              onChangeText={setConditionDraft}
              onSubmitEditing={onAddCondition}
              onFocus={onConditionFocus}
              returnKeyType="done"
              style={styles.conditionTextInput}
            />
          </View>
          <Button
            title="Add"
            variant="outline"
            size="sm"
            fullWidth={false}
            onPress={onAddCondition}
            disabled={loading}
            style={styles.addBtn}
          />
        </View>
        <Text style={styles.hint}>
          Tap a chip to remove. Unsaved text in the field is included when you
          save.
        </Text>
        {fields.conditions.length > 0 ? (
          <View style={styles.chipRow}>
            {fields.conditions.map((condition) => (
              <Pressable
                key={condition}
                style={styles.conditionChip}
                onPress={() => onRemoveCondition(condition)}
              >
                <Text style={styles.conditionChipText}>{condition} ×</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyConditions}>No conditions added yet.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  fieldLabel: {
    ...typography.label,
    color: colors.muted,
    marginBottom: -spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipText: { ...typography.caption, color: colors.foreground },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  conditionSection: { gap: spacing.sm, marginTop: spacing.xs },
  conditionLabel: {
    ...typography.label,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  conditionInput: { flex: 1, minWidth: 0 },
  conditionTextInput: {
    color: colors.foreground,
    ...Platform.select({
      android: { backgroundColor: colors.white },
      default: {},
    }),
  },
  addBtn: {
    flexShrink: 0,
    minWidth: 80,
  },
  hint: { ...typography.caption, color: colors.muted },
  emptyConditions: {
    ...typography.caption,
    color: colors.mutedLight,
    fontStyle: "italic",
  },
  conditionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  conditionChipText: { ...typography.caption, color: colors.primary },
});
