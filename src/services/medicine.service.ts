import { api } from "@/services/api";
import type {
  CreateMedicineData,
  Medicine,
  MedicineSearchResult,
  UpdateMedicineData,
} from "@/types/medicine.types";

export const medicineService = {
  getAll: async (params?: {
    organizationId?: string;
    search?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get("/medicines", { params });
    const { data, pagination, activeCount, inactiveCount } = response.data;
    return {
      medicines: (data || []) as Medicine[],
      total: pagination?.total || 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 20,
      totalPages: pagination?.totalPages || 1,
      activeCount: activeCount || 0,
      inactiveCount: inactiveCount || 0,
    };
  },

  search: async (query: string, organizationId?: string) => {
    // Symptom / indication matching is handled server-side (GET /medicines/search).
    const response = await api.get("/medicines/search", {
      params: { query, organizationId },
    });
    return (response.data.data || []) as MedicineSearchResult[];
  },

  create: async (data: CreateMedicineData): Promise<Medicine> => {
    const response = await api.post("/medicines", data);
    const body = response.data as { data?: Medicine } | Medicine;
    if (body && typeof body === "object" && "data" in body && body.data) {
      return body.data;
    }
    return body as Medicine;
  },

  getById: async (id: string): Promise<Medicine> => {
    const response = await api.get(`/medicines/${id}`);
    const body = response.data as { data?: Medicine } | Medicine;
    if (body && typeof body === "object" && "data" in body && body.data) {
      return body.data;
    }
    return body as Medicine;
  },

  update: async (id: string, data: UpdateMedicineData): Promise<Medicine> => {
    const response = await api.patch(`/medicines/${id}`, data);
    const body = response.data as { data?: Medicine } | Medicine;
    if (body && typeof body === "object" && "data" in body && body.data) {
      return body.data;
    }
    return body as Medicine;
  },
};
