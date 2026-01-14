import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "./api";
import type {
  UsersResponse,
  UserDetail,
  DetectionsResponse,
  DetectionWithInsights,
  StatisticsResponse,
  TimelineResponse,
  AdminCheckResponse,
  OceanInsights,
} from "../types/admin";

export function useAdminCheck() {
  return useQuery({
    queryKey: ["adminCheck"],
    queryFn: async () => {
      try {
        return await api.get<AdminCheckResponse>("/admin/check");
      } catch (e) {
        throw e;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface UseUsersOptions {
  page?: number;
  perPage?: number;
  search?: string;
}

export function useUsers(options: UseUsersOptions = {}) {
  const { page = 1, perPage = 10, search = "" } = options;

  return useQuery({
    queryKey: ["admin", "users", { page, perPage, search }],
    queryFn: async () => {
      try {
        const url = buildUrl("/admin/users", {
          page,
          per_page: perPage,
          search: search || undefined,
        });
        return await api.get<UsersResponse>(url);
      } catch (e) {
        throw e;
      }
    },
  });
}

export function useUserDetail(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "users", userId],
    queryFn: async () => {
      try {
        return await api.get<UserDetail>(`/admin/users/${userId}`);
      } catch (e) {
        throw e;
      }
    },
    enabled: userId !== null,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: number;
      role: "admin" | "user";
    }) => {
      try {
        return await api.put(`/admin/users/${userId}/role`, null, { role });
      } catch (e) {
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      try {
        return await api.delete(`/admin/users/${userId}`);
      } catch (e) {
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

interface UseDetectionsOptions {
  page?: number;
  perPage?: number;
  userId?: number;
  search?: string;
}

export function useDetections(options: UseDetectionsOptions = {}) {
  const { page = 1, perPage = 10, userId, search = "" } = options;

  return useQuery({
    queryKey: ["admin", "detections", { page, perPage, userId, search }],
    queryFn: async () => {
      try {
        const url = buildUrl("/admin/detections", {
          page,
          per_page: perPage,
          user_id: userId,
          search: search || undefined,
        });
        return await api.get<DetectionsResponse>(url);
      } catch (e) {
        throw e;
      }
    },
  });
}

export function useDetectionDetail(detectionId: number | null) {
  return useQuery({
    queryKey: ["admin", "detections", detectionId],
    queryFn: async () => {
      try {
        return await api.get<DetectionWithInsights>(
          `/admin/detections/${detectionId}`,
        );
      } catch (e) {
        throw e;
      }
    },
    enabled: detectionId !== null,
  });
}

export function useDeleteDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (detectionId: number) => {
      try {
        return await api.delete(`/admin/detections/${detectionId}`);
      } catch (e) {
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "detections"] });
    },
  });
}

export function useStatistics() {
  return useQuery({
    queryKey: ["admin", "statistics"],
    queryFn: async () => {
      try {
        return await api.get<StatisticsResponse>("/admin/statistics");
      } catch (e) {
        throw e;
      }
    },
    staleTime: 30 * 1000,
  });
}

export function useTimelineStatistics(days: number = 30) {
  return useQuery({
    queryKey: ["admin", "statistics", "timeline", days],
    queryFn: async () => {
      try {
        const url = buildUrl("/admin/statistics/timeline", { days });
        return await api.get<TimelineResponse>(url);
      } catch (e) {
        throw e;
      }
    },
    staleTime: 60 * 1000,
  });
}

interface DetectionInsightsResponse {
  detection_id: number;
  scores: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  insights: OceanInsights;
}

export function useDetectionInsights(detectionId: number | null) {
  return useQuery({
    queryKey: ["detection", "insights", detectionId],
    queryFn: async () => {
      try {
        return await api.get<DetectionInsightsResponse>(
          `/history/${detectionId}/insights`,
        );
      } catch (e) {
        throw e;
      }
    },
    enabled: detectionId !== null,
  });
}

export async function downloadReport(detectionId: number): Promise<void> {
  try {
    const blob = await api.download(`/history/${detectionId}/report`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `OCEAN_Report_${detectionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  } catch (e) {
    throw e;
  }
}

export async function openReportPreview(detectionId: number): Promise<void> {
  try {
    const blob = await api.download(`/history/${detectionId}/report/preview`);
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (e) {
    throw e;
  }
}
