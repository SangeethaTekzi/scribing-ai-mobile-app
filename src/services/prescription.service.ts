import axios from "axios";
import { api } from "@/services/api";
import type {
  Prescription,
  SignPrescriptionRequest,
} from "@/types/prescription.types";

export const PRESCRIPTION_ALREADY_SIGNED_MESSAGE =
  "A signed prescription already exists for this consultation";

export const prescriptionService = {
  signPrescription: async (
    sessionId: string,
    data: SignPrescriptionRequest,
  ): Promise<Prescription> => {
    const response = await api.post(
      `/sessions/${sessionId}/prescription/sign`,
      data,
    );
    return response.data.data;
  },

  getPrescriptionBilling: async (
    sessionId: string,
  ): Promise<Prescription | null> => {
    try {
      const response = await api.get(
        `/sessions/${sessionId}/prescription/billing`,
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

export const isPrescriptionAlreadySignedError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status === 409) return true;
  const message = error.response?.data?.message;
  return (
    typeof message === "string" &&
    message.includes(PRESCRIPTION_ALREADY_SIGNED_MESSAGE)
  );
};

export const getPrescriptionApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
};
