import {
  createOutOfStoreMedicationFromShorthand,
  medicationsAreDuplicates,
  prepareExternalSupplyMedication,
  wouldBlockPrescriptionMedicationAdd,
} from "@/utils/prescriptionMedication.utils";
import type { AiNotesMedication } from "@/types/ai-notes.types";

const med = (
  overrides: Partial<AiNotesMedication> & Pick<AiNotesMedication, "medicine">,
): AiNotesMedication => ({
  morning: "",
  afternoon: "",
  night: "",
  days: "",
  instructions: "",
  ...overrides,
});

describe("out-of-store prescription (mobile parity with web)", () => {
  it("does not block external add when formulary row shares a name", () => {
    const formulary = med({
      medicine: "Cetirizine 10 mg",
      medicineId: "cat-1",
      medicineNameSnapshot: "Cetirizine",
      strengthSnapshot: "10 mg",
      morning: "1",
      days: "5",
    });
    const external = createOutOfStoreMedicationFromShorthand(
      "cetirizine 10 hs 5d af",
    );

    expect(medicationsAreDuplicates(formulary, external)).toBe(false);
    expect(wouldBlockPrescriptionMedicationAdd(external, [formulary])).toBe(
      false,
    );
  });

  it("never blocks external supply on add", () => {
    const first = createOutOfStoreMedicationFromShorthand("Custom tonic tds 7d");
    const second = createOutOfStoreMedicationFromShorthand("custom tonic tds 7d");
    expect(wouldBlockPrescriptionMedicationAdd(second, [first])).toBe(false);
  });

  it("prepareExternalSupplyMedication strips catalog linkage", () => {
    const prepared = prepareExternalSupplyMedication(
      med({
        medicine: "montelukast 10 od 5d",
        medicineId: "drop-me",
        medicineNameSnapshot: "Montelukast",
      }),
    );
    expect(prepared.isExternalSupply).toBe(true);
    expect(prepared.medicineId).toBeUndefined();
  });
});
