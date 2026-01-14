/**
 * Dashboard Overview Component
 *
 * Displays admin dashboard statistics and metrics.
 * Refactored to use shared constants and utilities.
 */

import {
  Users,
  Brain,
  TrendingUp,
  Activity,
  Shield,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TRAIT_CONFIG, TRAIT_KEYS } from "@/lib/constants";
import type { StatisticsResponse, OceanScores } from "@/types/admin";

// =============================================================================
// Types
// =============================================================================

interface DashboardOverviewProps {
  statistics: StatisticsResponse | undefined;
  isLoading: boolean;
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label: string };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-gray-500">
          {title}
        </CardTitle>
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-600">
              +{trend.value} {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AverageScoresCardProps {
  scores: OceanScores | null | undefined;
}

function AverageScoresCard({ scores }: AverageScoresCardProps) {
  if (!scores) {
    return (
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Average OCEAN Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No detection data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Average OCEAN Scores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {TRAIT_KEYS.map((key) => {
          const config = TRAIT_CONFIG[key];
          const score = scores[key as keyof OceanScores];

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${config.textColor}`}>
                  {config.label}
                </span>
                <span className="text-sm font-bold text-gray-700">
                  {score.toFixed(1)}%
                </span>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface ScoreDistributionCardProps {
  distribution: StatisticsResponse["score_distribution"] | undefined;
}

function ScoreDistributionCard({ distribution }: ScoreDistributionCardProps) {
  if (!distribution) {
    return null;
  }

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Score Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {TRAIT_KEYS.map((key) => {
            const config = TRAIT_CONFIG[key];
            const traitDist = distribution[key as keyof typeof distribution];
            const total =
              traitDist.high + traitDist.medium + traitDist.low || 1;

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${config.textColor}`}>
                    {config.label}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600">H: {traitDist.high}</span>
                    <span className="text-yellow-600">
                      M: {traitDist.medium}
                    </span>
                    <span className="text-red-600">L: {traitDist.low}</span>
                  </div>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(traitDist.high / total) * 100}%` }}
                  />
                  <div
                    className="bg-yellow-500 transition-all"
                    style={{ width: `${(traitDist.medium / total) * 100}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(traitDist.low / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>High (≥60%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>Medium (40-59%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Low (&lt;40%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TopUsersCardProps {
  topUsers: StatisticsResponse["top_users"] | undefined;
}

function TopUsersCard({ topUsers }: TopUsersCardProps) {
  if (!topUsers || topUsers.length === 0) {
    return null;
  }

  const getRankColor = (index: number): string => {
    switch (index) {
      case 0:
        return "bg-yellow-500";
      case 1:
        return "bg-gray-400";
      case 2:
        return "bg-amber-600";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Top Users by Detections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRankColor(index)}`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">
                  {user.detection_count}
                </p>
                <p className="text-xs text-gray-500">detections</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 w-full bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DashboardOverview({
  statistics,
  isLoading,
}: DashboardOverviewProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const overview = statistics?.overview;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={overview?.total_users ?? 0}
          description="Registered users"
          icon={Users}
          trend={
            overview?.recent_users_7d
              ? { value: overview.recent_users_7d, label: "this week" }
              : undefined
          }
        />
        <StatCard
          title="Total Detections"
          value={overview?.total_detections ?? 0}
          description="Personality analyses"
          icon={Brain}
          trend={
            overview?.recent_detections_7d
              ? { value: overview.recent_detections_7d, label: "this week" }
              : undefined
          }
        />
        <StatCard
          title="Admin Users"
          value={overview?.total_admins ?? 0}
          description="System administrators"
          icon={Shield}
        />
        <StatCard
          title="Recent Activity"
          value={overview?.recent_detections_7d ?? 0}
          description="Detections in last 7 days"
          icon={Calendar}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <AverageScoresCard scores={statistics?.average_scores} />
        <ScoreDistributionCard distribution={statistics?.score_distribution} />
      </div>

      {/* Top Users */}
      <TopUsersCard topUsers={statistics?.top_users} />
    </div>
  );
}
