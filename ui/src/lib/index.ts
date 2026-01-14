/**
 * Library barrel export.
 *
 * Re-exports all library modules for convenient importing.
 */

// Utilities
export { cn } from "./utils";

// API client
export { api, API_BASE, ApiError, buildUrl } from "./api";

// Constants
export {
  TRAIT_CONFIG,
  TRAIT_KEYS,
  SCORE_THRESHOLDS,
  FILE_UPLOAD,
  PAGINATION,
  getScoreLevel,
  getScoreLevelLabel,
  getScoreLevelColor,
  LEVEL_BADGE_STYLES,
} from "./constants";
export type { TraitConfig, ScoreLevel } from "./constants";

// Hooks
export {
  useVideoUpload,
  useDetectionHistory,
  useDetection,
  useDetect,
  useDeleteDetection,
  downloadReport,
  previewReport,
} from "./hooks";
export type { OceanScores, DetectionResult, DetectionInput } from "./hooks";

// Admin API hooks
export {
  useAdminCheck,
  useUsers,
  useUserDetail,
  useUpdateUserRole,
  useDeleteUser,
  useDetections,
  useDetectionDetail,
  useDeleteDetection as useAdminDeleteDetection,
  useStatistics,
  useTimelineStatistics,
  useDetectionInsights,
  downloadReport as adminDownloadReport,
  openReportPreview,
} from "./admin-api";
