import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export interface OceanScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface DetectionResult {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  image_path: string | null;
  created_at: string;
  user_id: number;
  results: OceanScores;
}

export interface DetectionInput {
  file: File;
  name: string;
  age: number;
  gender: "male" | "female";
}

export function useDetectionHistory() {
  return useQuery({
    queryKey: ["detectionHistory"],
    queryFn: () => api.get<DetectionResult[]>("/history"),
    staleTime: 30 * 1000,
  });
}

export function useDetection(detectionId: number | null) {
  return useQuery({
    queryKey: ["detection", detectionId],
    queryFn: () => api.get<DetectionResult>(`/history/${detectionId}`),
    enabled: detectionId !== null,
  });
}

export function useDetect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DetectionInput) => {
      const formData = new FormData();
      formData.append("video", input.file);
      formData.append("name", input.name);
      formData.append("age", input.age.toString());
      formData.append("gender", input.gender);

      return api.upload<DetectionResult>("/predict", null, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detectionHistory"] });
    },
  });
}

export function useDeleteDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (detectionId: number) => {
      return api.delete(`/history/${detectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detectionHistory"] });
    },
  });
}

export async function downloadReport(
  detectionId: number,
): Promise<void> {
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
  } catch (error) {
    console.error("Failed to download report:", error);
    throw error;
  }
}

export async function previewReport(
  detectionId: number,
): Promise<void> {
  try {
    const blob = await api.download(
      `/history/${detectionId}/report/preview`,
    );
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (error) {
    console.error("Failed to preview report:", error);
    throw error;
  }
}
