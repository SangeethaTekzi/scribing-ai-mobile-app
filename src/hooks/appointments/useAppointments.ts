import { useQuery } from "@tanstack/react-query";
import { appointmentService } from "@/services/appointment.service";
import { appointmentKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth.store";
import { useTenantScope } from "@/hooks/useTenantScope";
import { getUserOrganizationId } from "@/types/auth.types";

interface UseAppointmentsParams {
  organizationId?: string;
  patientId?: string;
  doctorId?: string;
  status?: string;
  today?: boolean;
  upcoming?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useAppointments = (params?: UseAppointmentsParams) => {
  const user = useAuthStore((state) => state.user);
  const { organizationId: scopedOrgId } = useTenantScope();
  const organizationId =
    params?.organizationId ||
    scopedOrgId ||
    getUserOrganizationId(user) ||
    "";
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const enabled = params?.enabled !== false && Boolean(organizationId);

  const query = useQuery({
    queryKey: appointmentKeys.list({
      organizationId,
      patientId: params?.patientId || "",
      doctorId: params?.doctorId || "",
      status: params?.status || "",
      today: params?.today ? "true" : "",
      upcoming: params?.upcoming ? "true" : "",
      dateFrom: params?.dateFrom || "",
      dateTo: params?.dateTo || "",
      page,
      limit,
    }),
    queryFn: () =>
      appointmentService.getAll({
        organizationId,
        patientId: params?.patientId || undefined,
        doctorId: params?.doctorId || undefined,
        status: params?.status || undefined,
        today: params?.today ? "true" : undefined,
        upcoming: params?.upcoming ? "true" : undefined,
        dateFrom: params?.dateFrom || undefined,
        dateTo: params?.dateTo || undefined,
        page,
        limit,
      }),
    enabled,
    staleTime: 30 * 1000,
  });

  return {
    ...query,
    organizationId,
    appointments: query.data?.appointments || [],
    total: query.data?.total || 0,
    page: query.data?.page || 1,
    limit: query.data?.limit || limit,
    totalPages: query.data?.totalPages || 1,
  };
};
