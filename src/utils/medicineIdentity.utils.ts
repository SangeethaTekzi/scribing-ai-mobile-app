/** Keep in sync with scribing-ai-api/src/utils/medicineIdentity.utils.ts */

export const MEDICINE_DUPLICATE_USER_MESSAGE =
  "This medicine with the same strength, form and route already exists in your organization.";

export const normalizeMedicineKeyPart = (value: string): string =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const normalizeMedicineStrengthForComparison = (strength: string): string => {
  const collapsed = (strength || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!collapsed) return "";

  const milligramOnly = collapsed.match(/^(\d+(?:\.\d+)?)\s*mg$/);
  if (milligramOnly) return milligramOnly[1];

  const numericOnly = collapsed.match(/^(\d+(?:\.\d+)?)$/);
  if (numericOnly) return numericOnly[1];

  return collapsed;
};

export type MedicineDuplicateIdentity = {
  normalizedGenericName: string;
  normalizedStrength: string;
  normalizedForm: string;
  normalizedRoute: string;
};

export const buildMedicineDuplicateIdentity = (input: {
  name: string;
  genericName?: string;
  brandName?: string;
  form?: string;
  strength?: string;
  route?: string;
}): MedicineDuplicateIdentity => {
  const name = input.name.trim();
  const genericName = (input.genericName || "").trim();

  return {
    normalizedGenericName: normalizeMedicineKeyPart(genericName || name),
    normalizedStrength: normalizeMedicineStrengthForComparison(
      input.strength || "",
    ),
    normalizedForm: normalizeMedicineKeyPart(input.form || ""),
    normalizedRoute: normalizeMedicineKeyPart(input.route || ""),
  };
};

export const medicineDuplicateIdentityFromRecord = (record: {
  name: string;
  genericName?: string;
  form?: string;
  strength?: string;
  route?: string;
  normalizedStrength?: string;
}): MedicineDuplicateIdentity => {
  const strength = record.strength?.trim()
    ? record.strength
    : record.normalizedStrength || "";

  return buildMedicineDuplicateIdentity({
    name: record.name,
    genericName: record.genericName,
    form: record.form,
    strength,
    route: record.route,
  });
};

export const medicineDuplicateIdentitiesMatch = (
  left: MedicineDuplicateIdentity,
  right: MedicineDuplicateIdentity,
): boolean =>
  left.normalizedGenericName === right.normalizedGenericName &&
  left.normalizedStrength === right.normalizedStrength &&
  left.normalizedForm === right.normalizedForm &&
  left.normalizedRoute === right.normalizedRoute;
