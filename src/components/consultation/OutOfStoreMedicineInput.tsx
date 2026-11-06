import React, { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/theme";

interface OutOfStoreMedicineInputProps {
  onSubmitLine: (line: string) => void;
}

export function OutOfStoreMedicineInput({
  onSubmitLine,
}: OutOfStoreMedicineInputProps) {
  const [value, setValue] = useState("");
  const submitLockRef = useRef(false);

  const submit = () => {
    const line = value.trim();
    if (!line || submitLockRef.current) return;
    submitLockRef.current = true;
    onSubmitLine(line);
    setValue("");
    submitLockRef.current = false;
  };

  const handleSubmitEditing = () => {
    submit();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Ionicons name="sparkles" size={12} color={colors.primary} />
        <Text style={styles.label}>Type it the way you&apos;d write it</Text>
      </View>
      <Text style={styles.hint}>
        Out-of-store medicine (not in your catalog). No price is added.
      </Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType="done"
        blurOnSubmit={false}
        placeholder={'e.g. "pcm 650 tds 5d" or "cetirizine 10 hs 5d af"'}
        placeholderTextColor={colors.mutedLight}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  hint: {
    ...typography.caption,
    color: colors.mutedLight,
  },
  input: {
    ...typography.body,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
});
