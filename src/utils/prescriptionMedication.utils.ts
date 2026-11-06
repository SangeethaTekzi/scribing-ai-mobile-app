import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { MedicineSearchResult } from "@/types/medicine.types";

export const normalizeCatalogToken = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const createEmptyMedication = (): AiNotesMedication => ({
  medicine: "",
  morning: "",
  afternoon: "",
  night: "",
  days: "",
  instructions: "",
});

/** Free-text / out-of-store row: never link to formulary or catalog pricing. */
export const prepareExternalSupplyMedication = (
  medication: AiNotesMedication,
): AiNotesMedication => {
  const line = medication.medicine?.trim() || "";
  return {
    ...medication,
    medicine: line,
    isExternalSupply: true,
    medicineId: undefined,
    medicineNameSnapshot: undefined,
    brandNameSnapshot: undefined,
    catalogCostPreview: undefined,
    priceAtPrescription: undefined,
  };
};

export const medicationFromFormulary = (
  medicine: MedicineSearchResult,
): AiNotesMedication => {
  const id = String(medicine.id || medicine._id || "").trim();
  return {
    ...createEmptyMedication(),
    medicine: medicine.strength
      ? `${medicine.name} ${medicine.strength}`.trim()
      : medicine.name,
    medicineId: id || undefined,
    medicineNameSnapshot: medicine.name,
    strengthSnapshot: medicine.strength || "",
    brandNameSnapshot: medicine.brandName || "",
    formSnapshot: medicine.form || "Tablet",
    catalogCostPreview: medicine.cost,
    morning: "1",
    afternoon: "0",
    night: "0",
    days: "5",
    instructions: "After food",
  };
};

export const createOutOfStoreMedicationFromShorthand = (
  value: string,
): AiNotesMedication => {
  const line = value.trim();
  const schedule = parseManScheduleFromText(line);
  const daysMatch = line.match(/(\d+)\s*d(?:ays?)?/i);
  const instructions = /bf|before food/i.test(line)
    ? "Before food"
    : /af|after food/i.test(line)
      ? "After food"
      : "After food";

  return prepareExternalSupplyMedication({
    ...createEmptyMedication(),
    medicine: line,
    formSnapshot: "Tablet",
    morning: schedule?.morning ?? "1",
    afternoon: schedule?.afternoon ?? "0",
    night: schedule?.night ?? "0",
    days: daysMatch?.[1] ?? "5",
    instructions,
  });
};

export const formatMedicationDuplicateLabel = (
  med: Pick<
    AiNotesMedication,
    "medicine" | "medicineNameSnapshot" | "strengthSnapshot"
  >,
): string => {
  const name = (med.medicineNameSnapshot || med.medicine || "Medication").trim();
  const strength = med.strengthSnapshot?.trim();
  return strength ? `${name} ${strength}` : name;
};

const getMedicationDuplicateKeys = (
  med: Pick<
    AiNotesMedication,
    | "medicineId"
    | "medicineNameSnapshot"
    | "medicine"
    | "strengthSnapshot"
    | "isExternalSupply"
  >,
): Set<string> => {
  if (med.isExternalSupply) {
    const line = normalizeCatalogToken(med.medicine || "");
    return line ? new Set([`ext:${line}`]) : new Set();
  }

  const keys = new Set<string>();
  const medicineId = med.medicineId?.trim() || "";
  const name = normalizeCatalogToken(
    med.medicineNameSnapshot || med.medicine || "",
  );
  const strength = normalizeCatalogToken(med.strengthSnapshot || "");

  if (medicineId) {
    keys.add(`id:${medicineId}`);
  }
  if (name && strength) {
    keys.add(`ns:${name}::${strength}`);
    keys.add(`full:${normalizeCatalogToken(`${name} ${strength}`)}`);
  } else if (name) {
    keys.add(`full:${name}`);
  }

  const medicineField = normalizeCatalogToken(med.medicine || "");
  if (medicineField) {
    keys.add(`full:${medicineField}`);
  }

  return keys;
};

export const medicationsAreDuplicates = (
  left: Pick<
    AiNotesMedication,
    | "medicineId"
    | "medicineNameSnapshot"
    | "medicine"
    | "strengthSnapshot"
    | "isExternalSupply"
  >,
  right: Pick<
    AiNotesMedication,
    | "medicineId"
    | "medicineNameSnapshot"
    | "medicine"
    | "strengthSnapshot"
    | "isExternalSupply"
  >,
): boolean => {
  const leftExternal = Boolean(left.isExternalSupply);
  const rightExternal = Boolean(right.isExternalSupply);
  if (leftExternal !== rightExternal) {
    return false;
  }
  if (leftExternal && rightExternal) {
    return (
      normalizeCatalogToken(left.medicine || "") ===
      normalizeCatalogToken(right.medicine || "")
    );
  }

  const leftKeys = getMedicationDuplicateKeys(left);
  const rightKeys = getMedicationDuplicateKeys(right);
  for (const key of leftKeys) {
    if (rightKeys.has(key)) return true;
  }
  return false;
};

export const wouldDuplicateMedication = (
  candidate: AiNotesMedication,
  existing: AiNotesMedication[],
): boolean =>
  existing.some((row) => medicationsAreDuplicates(candidate, row));

/** Catalog/search adds only; out-of-store free-text is never blocked on add. */
export const wouldBlockPrescriptionMedicationAdd = (
  candidate: AiNotesMedication,
  existing: AiNotesMedication[],
): boolean => {
  if (!candidate.medicine?.trim()) {
    return true;
  }
  if (candidate.isExternalSupply) {
    return false;
  }
  return wouldDuplicateMedication(candidate, existing);
};

export const PRESCRIPTION_DAYS_MAX = 365;

export const hasMedicationDosageFrequency = (
  med: Pick<AiNotesMedication, "morning" | "afternoon" | "night">,
): boolean =>
  Boolean(
    med.morning?.trim() || med.afternoon?.trim() || med.night?.trim(),
  );

export type MedicationDaysValidation =
  | { valid: true; value: number }
  | { valid: false; reason: "missing" | "invalid" | "too_large" };

export const validateMedicationDaysValue = (
  days: string | undefined,
): MedicationDaysValidation => {
  const trimmed = days?.trim() || "";
  if (!trimmed) {
    return { valid: false, reason: "missing" };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, reason: "invalid" };
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { valid: false, reason: "invalid" };
  }
  if (parsed > PRESCRIPTION_DAYS_MAX) {
    return { valid: false, reason: "too_large" };
  }
  return { valid: true, value: parsed };
};

const clinicalMessage = (
  row: number,
  daysResult: Extract<MedicationDaysValidation, { valid: false }>,
): string => {
  if (daysResult.reason === "missing") {
    return `Medication ${row} requires the number of days.`;
  }
  if (daysResult.reason === "too_large") {
    return `Medication ${row} days cannot exceed ${PRESCRIPTION_DAYS_MAX}.`;
  }
  return `Medication ${row} days must be a positive whole number.`;
};

/** Matches API `assertPrescriptionClinicalCompleteness` for editable rows. */
export const findClinicalCompletenessIssue = (
  medications: AiNotesMedication[],
): { index: number; message: string } | null => {
  for (let index = 0; index < medications.length; index += 1) {
    const row = index + 1;
    const medication = medications[index];
    if (!medication.medicine?.trim()) continue;

    if (!hasMedicationDosageFrequency(medication)) {
      return {
        index,
        message: `Medication ${row} needs at least one dosage/frequency.`,
      };
    }

    const daysResult = validateMedicationDaysValue(medication.days);
    if (!daysResult.valid) {
      return {
        index,
        message: clinicalMessage(row, daysResult),
      };
    }
  }

  return null;
};

/** Parse common Indian prescription patterns like 1-0-1 or 1/0/1 from free text. */
export const parseManScheduleFromText = (
  text?: string,
): Pick<AiNotesMedication, "morning" | "afternoon" | "night"> | null => {
  const trimmed = text?.trim();
  if (!trimmed) return null;

  const dash = trimmed.match(/\b(\d+)\s*[-–]\s*(\d+)\s*[-–]\s*(\d+)\b/);
  if (dash) {
    return { morning: dash[1], afternoon: dash[2], night: dash[3] };
  }

  const slash = trimmed.match(/\b(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\b/);
  if (slash) {
    return { morning: slash[1], afternoon: slash[2], night: slash[3] };
  }

  return null;
};

export const inferDefaultDaysFromPlan = (
  plan?: string,
  instructions?: string,
): string | undefined => {
  const fromPlan = plan?.match(/(\d+)\s*days?/i)?.[1];
  if (fromPlan) return fromPlan;
  return instructions?.match(/(?:for\s+)?(\d+)\s*days?/i)?.[1];
};

const coerceDaysString = (days: unknown): string | undefined => {
  if (days == null) return undefined;
  if (typeof days === "number" && Number.isFinite(days) && days > 0) {
    return String(Math.trunc(days));
  }
  const trimmed = String(days).trim();
  return trimmed || undefined;
};

export const normalizeMedicationsForEditing = (
  medications: AiNotesMedication[] | undefined,
  plan?: string,
): AiNotesMedication[] | undefined => {
  if (!medications?.length) return medications;

  return medications.map((med) => {
    let next: AiNotesMedication = { ...med };
    const coercedDays = coerceDaysString(next.days);
    if (coercedDays) {
      next = { ...next, days: coercedDays };
    }

    if (!hasMedicationDosageFrequency(next)) {
      const schedule =
        parseManScheduleFromText(next.instructions) ||
        parseManScheduleFromText(plan);
      if (schedule) {
        next = { ...next, ...schedule };
      }
    }

    if (!next.days?.trim()) {
      const defaultDays = inferDefaultDaysFromPlan(plan, next.instructions);
      if (defaultDays) {
        next = { ...next, days: defaultDays };
      }
    }

    return next;
  });
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: { message?: string } } })
      .response?.data;
    if (data?.message) return data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
