/**
 * Insight Card Component
 *
 * Displays OCEAN personality insights with expandable trait sections.
 * Refactored to use shared constants.
 */

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TRAIT_CONFIG, TRAIT_KEYS, LEVEL_BADGE_STYLES } from "@/lib/constants";
import type { InsightResult, OceanInsights } from "@/types/admin";

// =============================================================================
// Types
// =============================================================================

interface InsightCardProps {
  insights: OceanInsights;
  compact?: boolean;
}

type TraitKey = (typeof TRAIT_KEYS)[number];

// =============================================================================
// Sub-components
// =============================================================================

interface TraitInsightItemProps {
  trait: TraitKey;
  insight: InsightResult;
  expanded: boolean;
  onToggle: () => void;
}

function TraitInsightItem({
  trait,
  insight,
  expanded,
  onToggle,
}: TraitInsightItemProps) {
  const config = TRAIT_CONFIG[trait];

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden transition-all duration-200`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{config.icon}</span>
          <div className="text-left">
            <h4 className={`font-semibold ${config.textColor}`}>
              {config.label}
            </h4>
            <p className="text-xs text-gray-600">{insight.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs ${LEVEL_BADGE_STYLES[insight.level]}`}
          >
            {insight.level.toUpperCase()}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/50 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {insight.description}
          </p>

          {insight.characteristics.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Karakteristik
              </p>
              <ul className="space-y-1">
                {insight.characteristics.slice(0, 4).map((char, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <CheckCircle2
                      className={`h-4 w-4 mt-0.5 ${config.textColor}`}
                    />
                    <span>{char}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Saran
              </p>
              <ul className="space-y-1">
                {insight.suggestions.slice(0, 2).map((sugg, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <ArrowRight className="h-4 w-4 mt-0.5 text-gray-400" />
                    <span>{sugg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function InsightCard({ insights, compact = false }: InsightCardProps) {
  const [expandedTraits, setExpandedTraits] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleTrait = (trait: string) => {
    const newExpanded = new Set(expandedTraits);
    if (newExpanded.has(trait)) {
      newExpanded.delete(trait);
    } else {
      newExpanded.add(trait);
    }
    setExpandedTraits(newExpanded);
  };

  const displayTraits =
    compact && !showAll ? TRAIT_KEYS.slice(0, 3) : TRAIT_KEYS;

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          Personality Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
          <p className="text-sm text-gray-700 leading-relaxed italic">
            "{insights.summary}"
          </p>
        </div>

        {/* Trait Insights */}
        <div className="space-y-2">
          {displayTraits.map((trait) => (
            <TraitInsightItem
              key={trait}
              trait={trait}
              insight={insights[trait as keyof Omit<OceanInsights, "summary">]}
              expanded={expandedTraits.has(trait)}
              onToggle={() => toggleTrait(trait)}
            />
          ))}
        </div>

        {/* Show more button for compact mode */}
        {compact && TRAIT_KEYS.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            {showAll
              ? "Show Less"
              : `Show ${TRAIT_KEYS.length - 3} More Traits`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Compact Summary Variant
// =============================================================================

interface CompactInsightSummaryProps {
  insights: OceanInsights;
}

export function CompactInsightSummary({
  insights,
}: CompactInsightSummaryProps) {
  return (
    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-gray-700 leading-relaxed">
          {insights.summary}
        </p>
      </div>
    </div>
  );
}
