import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authService } from "@/services/auth.service";
import { colors, spacing, typography } from "@/theme";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      Alert.alert("Invalid link", "Reset token is missing.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1800);
    } catch (error: unknown) {
      const message =
        (
          error as {
            response?: { data?: { message?: string } };
          }
        )?.response?.data?.message || "Failed to reset password.";
      Alert.alert("Reset failed", message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <View style={styles.screen}>
        <GlassHeader title="Reset password" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Invalid or missing reset token</Text>
          <Button
            title="Back to Sign In"
            onPress={() => router.replace("/(auth)/login")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <GlassHeader title="Reset password" showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing["2xl"] },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.subtitle}>
            Enter and confirm your new password to finish resetting access.
          </Text>

          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Password reset successful</Text>
              <Text style={styles.subtitle}>Redirecting to sign in…</Text>
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="New password"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    placeholder="Enter new password"
                    editable={!loading}
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirm password"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmPassword?.message}
                    placeholder="Re-enter new password"
                    editable={!loading}
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                )}
              />
              <Button
                title="Reset Password"
                loading={loading}
                onPress={handleSubmit(onSubmit)}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  title: { ...typography.heading, color: colors.foreground },
  subtitle: { ...typography.body, color: colors.muted },
  errorTitle: {
    ...typography.heading,
    color: colors.danger,
    textAlign: "center",
  },
  successBox: { gap: spacing.sm },
  successTitle: { ...typography.heading, color: colors.success },
});
