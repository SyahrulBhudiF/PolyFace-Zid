/**
 * OCEAN Results Component
 *
 * Displays the OCEAN personality detection results with visual bars and insights.
 */

import { Download, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TRAIT_CONFIG,
  TRAIT_KEYS,
  getScoreLevelLabel,
  getScoreLevelColor,
} from "@/lib/constants";
import { downloadReport, OceanScores } from "@/lib/hooks";
import { useDetectionInsights } from "@/lib";

// Icon mapping for traits
import { Eye, Shield, Zap, Heart, Brain } from "lucide-react";

const TRAIT_ICONS = {
  openness: Eye,
  conscientiousness: Shield,
  extraversion: Zap,
  agreeableness: Heart,
  neuroticism: Brain,
} as const;

interface OceanResultsProps {
  results: OceanScores;
  detectionId: number;
}

export function OceanResults({ results, detectionId }: OceanResultsProps) {
  const { data: insightsData, isLoading: insightsLoading, isError: insightsError } = useDetectionInsights(detectionId);
  const summary = insightsData?.insights?.summary;
  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          Video Personality Analysis Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Personality summary (descriptive text from detection.insights.summary) */}
        {!insightsLoading && !insightsError && summary && (
          <div className="mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-600">Ringkasan</span>
            </div>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{summary}</p>
          </div>
        )}

        <div className="grid gap-6">
          {TRAIT_KEYS.map((key) => {
            const config = TRAIT_CONFIG[key];
            const Icon = TRAIT_ICONS[key as keyof typeof TRAIT_ICONS];
            const value = results[key as keyof OceanScores];

            return (
              <TraitResultItem
                key={key}
                label={config.label}
                description={config.description}
                value={value}
                gradient={config.gradient}
                textColor={config.textColor}
                bgColor={config.bgColor}
                icon={Icon}
              />
            );
          })}
        </div>

        {/* Download Report Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={() => downloadReport(detectionId)}
            className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface TraitResultItemProps {
  label: string;
  description: string;
  value: number;
  gradient: string;
  textColor: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

function TraitResultItem({
  label,
  description,
  value,
  gradient,
  textColor,
  bgColor,
  icon: Icon,
}: TraitResultItemProps) {
  return (
    <div className={`p-4 rounded-xl ${bgColor} border border-gray-200`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${gradient}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${textColor}`}>{label}</h3>
            <p className="text-xs text-gray-600">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${textColor}`}>{value}%</div>
          <Badge className={`text-xs ${getScoreLevelColor(value)} border-0`}>
            {getScoreLevelLabel(value)}
          </Badge>
        </div>
      </div>
      <div className="relative">
        <Progress value={value} className="h-3 bg-white/50" />
      </div>
    </div>
  );
}

// =============================================================================
// Compact Results (for history items)
// =============================================================================

interface CompactOceanResultsProps {
  results: OceanScores;
}

export function CompactOceanResults({ results }: CompactOceanResultsProps) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {TRAIT_KEYS.map((key) => {
        const config = TRAIT_CONFIG[key];
        const value = results[key as keyof OceanScores];

        return (
          <div key={key} className="text-center">
            <div className={`text-xs font-medium ${config.textColor}`}>
              {value}%
            </div>
            <Progress value={value} className="h-1 mt-1" />
          </div>
        );
      })}
    </div>
  );
}
