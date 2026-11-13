import { describe, expect, it } from "vitest";
import {
  buildMedicineDuplicateIdentity,
  medicineDuplicateIdentitiesMatch,
  normalizeMedicineStrengthForComparison,
} from "@/utils/medicineIdentity.utils";

describe("normalizeMedicineStrengthForComparison", () => {
  it("treats mg variants as the same comparison key", () => {
    expect(normalizeMedicineStrengthForComparison("250 mg")).toBe("250");
    expect(normalizeMedicineStrengthForComparison("250")).toBe("250");
    expect(normalizeMedicineStrengthForComparison("250mg")).toBe("250");
    expect(normalizeMedicineStrengthForComparison("250 MG")).toBe("250");
  });

  it("keeps distinct strengths and units separate", () => {
    expect(normalizeMedicineStrengthForComparison("500 mg")).toBe("500");
    expect(
      normalizeMedicineStrengthForComparison("250 mg"),
    ).not.toBe(normalizeMedicineStrengthForComparison("500 mg"));
    expect(
      normalizeMedicineStrengthForComparison("250 mcg"),
    ).not.toBe(normalizeMedicineStrengthForComparison("250 mg"));
  });
});

describe("medicineDuplicateIdentitiesMatch", () => {
  it("matches case-insensitive medicine names", () => {
    const existing = buildMedicineDuplicateIdentity({
      name: "Paracetamol",
      strength: "250 mg",
      form: "Tablet",
      route: "Oral",
    });
    const incoming = buildMedicineDuplicateIdentity({
      name: " paracetamol ",
      strength: "250",
      form: "tablet",
      route: "oral",
    });
    expect(medicineDuplicateIdentitiesMatch(existing, incoming)).toBe(true);
  });
});
