import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  User,
  Calendar,
  Download,
  FileText,
  Sparkles,
} from "lucide-react";
import { useDetectionDetail } from "@/lib/admin-api";
import type { OceanScores, InsightResult } from "@/types/admin";

interface DetectionDetailModalProps {
  detectionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadReport?: (detectionId: number) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoreLevel(score: number): "high" | "medium" | "low" {
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function getLevelColor(level: "high" | "medium" | "low") {
  switch (level) {
    case "high":
      return "bg-green-100 text-green-700 border-green-200";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "low":
      return "bg-red-100 text-red-700 border-red-200";
  }
}

const TRAIT_CONFIG = {
  openness: {
    label: "Openness",
    shortLabel: "O",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  conscientiousness: {
    label: "Conscientiousness",
    shortLabel: "C",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-600",
  },
  extraversion: {
    label: "Extraversion",
    shortLabel: "E",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-600",
  },
  agreeableness: {
    label: "Agreeableness",
    shortLabel: "A",
    color: "bg-purple-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
  neuroticism: {
    label: "Neuroticism",
    shortLabel: "N",
    color: "bg-red-500",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
  },
} as const;

type TraitKey = keyof typeof TRAIT_CONFIG;

function ScoreCard({ traitKey, score }: { traitKey: TraitKey; score: number }) {
  const config = TRAIT_CONFIG[traitKey];
  const level = getScoreLevel(score);

  return (
    <div className={`${config.bgColor} rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.label}
        </span>
        <Badge variant="outline" className={getLevelColor(level)}>
          {level}
        </Badge>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-800">
          {score.toFixed(1)}
        </span>
        <span className="text-gray-500 text-sm mb-1">%</span>
      </div>
      <div className="h-2 bg-white/50 rounded-full overflow-hidden mt-2">
        <div
          className={`h-full rounded-full ${config.color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

function InsightCard({
  traitKey,
  insight,
}: {
  traitKey: TraitKey;
  insight: InsightResult;
}) {
  const config = TRAIT_CONFIG[traitKey];

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${config.color}`} />
          <h4 className="font-medium text-gray-800">{config.label}</h4>
        </div>
        <Badge variant="outline" className={getLevelColor(insight.level)}>
          {insight.level}
        </Badge>
      </div>
      <p className="text-sm text-gray-600">{insight.description}</p>

      {insight.characteristics && insight.characteristics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">
            Characteristics:
          </p>
          <div className="flex flex-wrap gap-1">
            {insight.characteristics.slice(0, 4).map((char, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs whitespace-normal break-words max-w-full"
              >
                {char}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {insight.suggestions && insight.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Suggestions:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {insight.suggestions.slice(0, 2).map((sug, idx) => (
              <li key={idx} className="flex items-start gap-1">
                <span className="text-green-500 mt-0.5">•</span>
                {sug}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export function DetectionDetailModal({
  detectionId,
  open,
  onOpenChange,
  onDownloadReport,
}: DetectionDetailModalProps) {
  const { data: detection, isLoading } = useDetectionDetail(
    open ? detectionId : null,
  );

  const traitKeys: TraitKey[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Detection Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : !detection ? (
            <div className="text-center py-8 text-gray-500">
              Detection not found
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subject Info Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl">
                      {getInitials(detection.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {detection.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      {detection.age && <span>{detection.age} years old</span>}
                      {detection.gender && (
                        <Badge variant="outline">{detection.gender}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {onDownloadReport && detectionId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownloadReport(detectionId)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Detection Date</span>
                  </div>
                  <p className="text-gray-700">
                    {formatDate(detection.created_at)}
                  </p>
                </div>
                {detection.user && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">Analyzed By</span>
                    </div>
                    <p className="text-gray-700">{detection.user.name}</p>
                    <p className="text-sm text-gray-500">
                      {detection.user.email}
                    </p>
                  </div>
                )}
              </div>

              {/* OCEAN Scores */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-gray-500" />
                  <h4 className="font-medium text-gray-700">OCEAN Scores</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {traitKeys.map((key) => (
                    <ScoreCard
                      key={key}
                      traitKey={key}
                      score={detection.results[key]}
                    />
                  ))}
                </div>
              </div>

              {/* Insights */}
              {detection.insights && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gray-500" />
                    <h4 className="font-medium text-gray-700">
                      Personality Insights
                    </h4>
                  </div>

                  {/* Summary */}
                  {detection.insights.summary && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-medium text-indigo-600">
                          Summary
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {detection.insights.summary}
                      </p>
                    </div>
                  )}

                  {/* Individual Trait Insights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {traitKeys.map((key) => {
                      const insight = detection.insights?.[key];
                      if (!insight) return null;
                      return (
                        <InsightCard
                          key={key}
                          traitKey={key}
                          insight={insight}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
