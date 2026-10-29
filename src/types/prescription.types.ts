export type PrescriptionStatus = "signed";

export type PrescriptionBillingItem = {
  id?: string;
  medicineId?: string;
  medicineNameSnapshot: string;
  strengthSnapshot?: string;
  morning: string;
  afternoon: string;
  night: string;
  dailyQuantity: number;
  durationDays: number;
  totalQuantity: number;
  unitPriceSnapshot: number;
  dailyCost: number;
  lineTotalCost: number;
  instructions?: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  sessionId: string;
  organizationId: string;
  doctorId: string;
  status: PrescriptionStatus;
  items: PrescriptionBillingItem[];
  subtotal: number;
  grandTotal: number;
  signedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SignPrescriptionMedication = {
  medicine: string;
  medicineId?: string;
  medicineNameSnapshot?: string;
  strengthSnapshot?: string;
  morning?: string;
  afternoon?: string;
  night?: string;
  days: string;
  instructions?: string;
};

export type SignPrescriptionRequest = {
  medications: SignPrescriptionMedication[];
};
