import type { AiNotesMedication } from "@/types/ai-notes.types";
import type { SignPrescriptionMedication } from "@/types/prescription.types";

export const toSignPrescriptionMedications = (
  medications: AiNotesMedication[],
): SignPrescriptionMedication[] =>
  medications
    .filter((medication) => medication.medicine.trim())
    .map((medication) => ({
      medicine: medication.medicine.trim(),
      ...(medication.medicineId?.trim()
        ? { medicineId: medication.medicineId.trim() }
        : {}),
      ...(medication.medicineNameSnapshot?.trim()
        ? { medicineNameSnapshot: medication.medicineNameSnapshot.trim() }
        : {}),
      ...(medication.strengthSnapshot?.trim()
        ? { strengthSnapshot: medication.strengthSnapshot.trim() }
        : {}),
      morning: (medication.morning || "0").trim(),
      afternoon: (medication.afternoon || "0").trim(),
      night: (medication.night || "0").trim(),
      days: (medication.days || "").trim(),
      ...(medication.instructions?.trim()
        ? { instructions: medication.instructions.trim() }
        : {}),
    }));
