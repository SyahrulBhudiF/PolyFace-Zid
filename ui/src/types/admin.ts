// =============================================================================
// OCEAN Insight Types
// =============================================================================

export interface InsightResult {
  level: "high" | "medium" | "low";
  title: string;
  description: string;
  characteristics: string[];
  suggestions: string[];
}

export interface OceanInsights {
  openness: InsightResult;
  conscientiousness: InsightResult;
  extraversion: InsightResult;
  agreeableness: InsightResult;
  neuroticism: InsightResult;
  summary: string;
}

export interface OceanScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

// =============================================================================
// User Types
// =============================================================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  is_admin: boolean;
  created_at: string;
  detection_count?: number;
}

export interface UserDetail extends User {
  detections: DetectionItem[];
  average_scores?: OceanScores;
}

// =============================================================================
// Detection Types
// =============================================================================

export interface DetectionItem {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  image_path: string | null;
  created_at: string;
  user_id: number;
  results: OceanScores;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface DetectionWithInsights extends DetectionItem {
  insights: OceanInsights;
}

// =============================================================================
// Pagination Types
// =============================================================================

export interface Pagination {
  page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  pagination: Pagination;
}

export interface UsersResponse extends PaginatedResponse<User> {
  users: User[];
}

export interface DetectionsResponse extends PaginatedResponse<DetectionItem> {
  detections: DetectionItem[];
}

// =============================================================================
// Statistics Types
// =============================================================================

export interface StatisticsOverview {
  total_users: number;
  total_detections: number;
  total_admins: number;
  recent_detections_7d: number;
  recent_users_7d: number;
}

export interface ScoreDistribution {
  high: number;
  medium: number;
  low: number;
}

export interface AllScoreDistributions {
  openness: ScoreDistribution;
  conscientiousness: ScoreDistribution;
  extraversion: ScoreDistribution;
  agreeableness: ScoreDistribution;
  neuroticism: ScoreDistribution;
}

export interface TopUser {
  id: number;
  name: string;
  email: string;
  detection_count: number;
}

export interface StatisticsResponse {
  overview: StatisticsOverview;
  average_scores: OceanScores | null;
  score_distribution: AllScoreDistributions;
  gender_distribution: Record<string, number>;
  age_distribution: Record<string, number>;
  top_users: TopUser[];
}

export interface TimelineDataPoint {
  date: string;
  detection_count: number;
  average_scores: {
    openness: number | null;
    conscientiousness: number | null;
    extraversion: number | null;
    agreeableness: number | null;
    neuroticism: number | null;
  };
}

export interface TimelineResponse {
  days: number;
  timeline: TimelineDataPoint[];
}

// =============================================================================
// Admin Check Types
// =============================================================================

export interface AdminCheckResponse {
  is_admin: boolean;
  role: "admin" | "user";
  user: {
    id: number;
    name: string;
    email: string;
  };
}
