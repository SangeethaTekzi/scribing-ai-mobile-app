import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  textInputNoFocusRingProps,
  textInputNoFocusRingStyle,
} from "@/theme/textInput";
import { colors, radius, spacing, typography } from "@/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  isPassword,
  style,
  ...props
}: InputProps) {
  const [secure, setSecure] = useState(Boolean(isPassword));

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.container,
          !!error && styles.errorBorder,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={20}
            color={colors.muted}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          {...props}
          {...textInputNoFocusRingProps}
          secureTextEntry={isPassword ? secure : false}
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            textInputNoFocusRingStyle,
            style,
          ]}
          placeholderTextColor={colors.mutedLight}
          cursorColor={colors.primary}
          selectionColor={colors.primaryLight}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          autoCapitalize={isPassword ? "none" : props.autoCapitalize}
          autoCorrect={isPassword ? false : props.autoCorrect}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setSecure((v) => !v)}
            hitSlop={12}
            style={styles.passwordToggle}
            accessibilityRole="button"
            accessibilityLabel={secure ? "Show password" : "Hide password"}
          >
            <Ionicons
              name={secure ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    ...typography.caption,
    color: colors.foreground,
    fontWeight: "600",
    marginBottom: 2,
  },
  container: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  errorBorder: {
    borderColor: colors.danger,
  },
  leftIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    minWidth: 0,
    ...typography.body,
    color: colors.foreground,
    paddingVertical: spacing.md,
  },
  inputWithToggle: {
    paddingRight: spacing.xs,
  },
  passwordToggle: {
    flexShrink: 0,
    marginLeft: spacing.sm,
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
  },
});
