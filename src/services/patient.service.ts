import { api } from "@/services/api";
import {
  CreatePatientData,
  Patient,
  UpdatePatientData,
} from "@/types/patient.types";
import type { PreviousHistoryItem } from "@/types/session.types";

export const patientService = {
  getAll: async (params?: {
    search?: string;
    isActive?: string;
    organizationId?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/patients", { params });
    const { data, pagination } = response.data;

    return {
      patients: (data || []) as Patient[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 5,
      totalPages: pagination?.totalPages || 1,
      activeCount: response.data.activeCount || 0,
      inactiveCount: response.data.inactiveCount || 0,
    };
  },

  getById: async (id: string): Promise<Patient> => {
    const response = await api.get(`/patients/${id}`);
    return response.data.data;
  },

  getPreviousHistory: async (
    patientId: string,
    params?: { excludeSessionId?: string; limit?: number },
  ): Promise<PreviousHistoryItem[]> => {
    const response = await api.get(
      `/patients/${encodeURIComponent(patientId)}/previous-history`,
      { params },
    );
    return (response.data?.data || []) as PreviousHistoryItem[];
  },

  create: async (data: CreatePatientData): Promise<Patient> => {
    const response = await api.post("/patients", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdatePatientData): Promise<Patient> => {
    const response = await api.put(`/patients/${id}`, data);
    return response.data.data;
  },

  deactivate: async (id: string): Promise<Patient> => {
    const response = await api.delete(`/patients/${id}`);
    return response.data.data;
  },

  setActive: async (id: string, isActive: boolean): Promise<Patient> => {
    const response = await api.patch(`/patients/${id}/activate`, { isActive });
    return response.data.data;
  },
};
