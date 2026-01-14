export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

export interface TraitConfig {
  key: string;
  label: string;
  description: string;
  gradient: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const TRAIT_CONFIG: Record<string, TraitConfig> = {
  openness: {
    key: "openness",
    label: "Openness",
    description: "Imagination, creativity",
    gradient: "bg-gradient-to-r from-blue-500 to-cyan-400",
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: "🎨",
  },
  conscientiousness: {
    key: "conscientiousness",
    label: "Conscientiousness",
    description: "Organization, discipline",
    gradient: "bg-gradient-to-r from-green-500 to-emerald-400",
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: "📋",
  },
  extraversion: {
    key: "extraversion",
    label: "Extraversion",
    description: "Social energy, assertiveness",
    gradient: "bg-gradient-to-r from-yellow-500 to-orange-400",
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: "⚡",
  },
  agreeableness: {
    key: "agreeableness",
    label: "Agreeableness",
    description: "Cooperation, trust",
    gradient: "bg-gradient-to-r from-purple-500 to-pink-400",
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    icon: "💜",
  },
  neuroticism: {
    key: "neuroticism",
    label: "Neuroticism",
    description: "Emotional stability",
    gradient: "bg-gradient-to-r from-red-500 to-rose-400",
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: "🧠",
  },
} as const;

export const TRAIT_KEYS = Object.keys(TRAIT_CONFIG) as Array<
  keyof typeof TRAIT_CONFIG
>;

export const SCORE_THRESHOLDS = {
  high: 60,
  medium: 40,
} as const;

export type ScoreLevel = "high" | "medium" | "low";

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.high) return "high";
  if (score >= SCORE_THRESHOLDS.medium) return "medium";
  return "low";
}

export function getScoreLevelLabel(score: number): string {
  if (score >= 80) return "Very High";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Low";
  return "Very Low";
}

export function getScoreLevelColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-blue-100 text-blue-800";
  if (score >= 40) return "bg-yellow-100 text-yellow-800";
  if (score >= 20) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

export const LEVEL_BADGE_STYLES: Record<ScoreLevel, string> = {
  high: "bg-green-100 text-green-700 border-green-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  low: "bg-red-100 text-red-700 border-red-300",
} as const;

export const FILE_UPLOAD = {
  maxSize: 100 * 1024 * 1024,
  acceptedTypes: ["video/mp4", "video/avi", "video/mov", "video/webm"],
  acceptedExtensions: ".mp4,.avi,.mov,.webm",
} as const;

export const PAGINATION = {
  defaultPage: 1,
  defaultPerPage: 10,
  perPageOptions: [5, 10, 20, 50],
} as const;
