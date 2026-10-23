import { Button } from "@/components/ui/Button";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { Input } from "@/components/ui/Input";
import { usePatientMutations } from "@/hooks/patients/usePatientMutations";
import { useSessionMutations } from "@/hooks/sessions/useSessionMutations";
import { useTenantScope } from "@/hooks/useTenantScope";
import {
  optionalPatientAgeSchema,
  requiredIndianMobileSchema,
} from "@/lib/validation";
import { useAuthStore } from "@/store/auth.store";
import { colors, radius, spacing, typography } from "@/theme";
import { BLOOD_GROUPS, type PatientGender } from "@/types/patient.types";
import {
  getPatientId,
  INDIAN_MOBILE_LENGTH,
  PATIENT_AGE_MAX,
  PATIENT_AGE_MIN,
  sanitizeIndianPhoneInput,
  sanitizePatientAgeInput,
} from "@/utils/patient.utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { useFormScrollIntoView } from "@/hooks/useFormScrollIntoView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

const createPatientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  gender: z.enum(["male", "female", "other", "unknown"]),
  phoneNumber: requiredIndianMobileSchema,
  age: optionalPatientAgeSchema,
  email: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Invalid email",
    ),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
});

type CreatePatientForm = z.infer<typeof createPatientSchema>;

const GENDERS: { value: PatientGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];

export default function CreatePatientScreen() {
  const insets = useSafeAreaInsets();
  const { organizationId } = useTenantScope();
  const user = useAuthStore((s) => s.user);
  const { createPatient } = usePatientMutations();
  const { createSession } = useSessionMutations();
  const [startConsult, setStartConsult] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const baseScrollBottomPadding = insets.bottom + spacing["3xl"];
  const {
    scrollViewportRef,
    setFieldRef,
    onFocusField,
    onScroll,
    scrollBottomPadding,
  } = useFormScrollIntoView(scrollRef, baseScrollBottomPadding);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreatePatientForm>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: "male",
      phoneNumber: "",
      age: "",
      email: "",
      address: "",
      bloodGroup: "",
      allergies: "",
    },
  });

  const gender = watch("gender");
  const bloodGroup = watch("bloodGroup");
  const loading = createPatient.isPending || createSession.isPending;

  const onSubmit = async (data: CreatePatientForm) => {
    if (!organizationId) {
      Alert.alert(
        "No workspace",
        "Select a workspace before creating patients.",
      );
      return;
    }

    try {
      const ageValue = data.age?.trim() ? Number(data.age) : undefined;
      const patient = await createPatient.mutateAsync({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        gender: data.gender,
        phoneNumber: data.phoneNumber.trim(),
        age: Number.isFinite(ageValue) ? ageValue : undefined,
        email: data.email?.trim() || undefined,
        address: data.address?.trim() || undefined,
        bloodGroup:
          (data.bloodGroup as (typeof BLOOD_GROUPS)[number]) || undefined,
        allergies: data.allergies
          ? data.allergies
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
        organizationId,
      });

      const patientId = getPatientId(patient);
      const doctorId = String(user?.id || user?._id || "");

      if (startConsult && patientId && doctorId) {
        const session = await createSession.mutateAsync({
          organizationId,
          patientId,
          userId: doctorId,
          sessionType: "consultation",
          title: `Consultation · ${data.firstName} ${data.lastName}`.trim(),
        });
        const sessionId = String(session._id || session.id || "");
        if (sessionId) {
          router.replace(
            `/consultation/${sessionId}/brief` as never,
          );
          return;
        }
      }

      Alert.alert("Patient created", "The patient was added successfully.");
      router.back();
    } catch (error: unknown) {
      const message =
        (
          error as {
            response?: { data?: { message?: string } };
          }
        )?.response?.data?.message || "Unable to create patient.";
      Alert.alert("Create failed", message);
    }
  };

  return (
    <View style={styles.screen}>
      <GlassHeader title="New Patient" showBack />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View ref={scrollViewportRef} style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: scrollBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
          <Text style={styles.subtitle}>
            Register a patient. Patient code is generated automatically.
          </Text>

          <View ref={setFieldRef("firstName")}>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="First name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={onFocusField("firstName")}
                error={errors.firstName?.message}
                editable={!loading}
              />
            )}
          />
          </View>
          <View ref={setFieldRef("lastName")}>
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Last name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={onFocusField("lastName")}
                error={errors.lastName?.message}
                editable={!loading}
              />
            )}
          />
          </View>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDERS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.chip,
                  gender === option.value && styles.chipSelected,
                ]}
                onPress={() => setValue("gender", option.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    gender === option.value && styles.chipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View ref={setFieldRef("phoneNumber")}>
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone"
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={INDIAN_MOBILE_LENGTH}
                placeholder="Enter mobile number"
                value={value}
                onChangeText={(text) =>
                  onChange(sanitizeIndianPhoneInput(text))
                }
                onBlur={onBlur}
                onFocus={onFocusField("phoneNumber")}
                error={errors.phoneNumber?.message}
                editable={!loading}
              />
            )}
          />
          </View>
          <View ref={setFieldRef("age")}>
          <Controller
            control={control}
            name="age"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Age (optional)"
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={3}
                placeholder={`${PATIENT_AGE_MIN}-${PATIENT_AGE_MAX}`}
                value={value}
                onChangeText={(text) => onChange(sanitizePatientAgeInput(text))}
                onBlur={onBlur}
                onFocus={onFocusField("age")}
                error={errors.age?.message}
                editable={!loading}
              />
            )}
          />
          </View>
          <View ref={setFieldRef("email")}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email (optional)"
                autoCapitalize="none"
                keyboardType="email-address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={onFocusField("email")}
                error={errors.email?.message}
                editable={!loading}
              />
            )}
          />
          </View>
          <View ref={setFieldRef("address")}>
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={onFocusField("address")}
                editable={!loading}
              />
            )}
          />
          </View>

          <Text style={styles.label}>Blood group</Text>
          <View style={styles.chipRow}>
            {BLOOD_GROUPS.map((group) => (
              <Pressable
                key={group}
                style={[
                  styles.chip,
                  bloodGroup === group && styles.chipSelected,
                ]}
                onPress={() =>
                  setValue("bloodGroup", bloodGroup === group ? "" : group)
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    bloodGroup === group && styles.chipTextSelected,
                  ]}
                >
                  {group}
                </Text>
              </Pressable>
            ))}
          </View>

          <View ref={setFieldRef("allergies")}>
          <Controller
            control={control}
            name="allergies"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Allergies (comma separated)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                onFocus={onFocusField("allergies")}
                editable={!loading}
                placeholder="Penicillin, Dust"
              />
            )}
          />
          </View>

          <Pressable
            style={styles.toggleRow}
            onPress={() => setStartConsult((prev) => !prev)}
          >
            <View
              style={[styles.checkbox, startConsult && styles.checkboxOn]}
            />
            <Text style={styles.toggleText}>
              Start consultation after creating
            </Text>
          </Pressable>

          <Button
            title="Create Patient"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            size="lg"
          />
          </View>
        </ScrollView>
        </View>
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
  },
  form: {
    gap: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "600",
    marginBottom: -4,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: { ...typography.caption, color: colors.foreground },
  chipTextSelected: { color: colors.primary, fontWeight: "700" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: { ...typography.body, color: colors.foreground, flex: 1 },
});
