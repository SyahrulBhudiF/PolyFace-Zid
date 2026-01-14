/**
 * Detections List Component
 *
 * Displays a table of OCEAN personality detections for admin management.
 * Refactored to use shared constants and utilities.
 */

import { useState } from "react";
import {
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Brain,
  FileText,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TRAIT_CONFIG, TRAIT_KEYS, getScoreLevel } from "@/lib/constants";
import { getInitials, formatDate } from "@/lib/utils";
import type { DetectionItem, Pagination, OceanScores } from "@/types/admin";

// =============================================================================
// Types
// =============================================================================

interface DetectionsListProps {
  detections: DetectionItem[] | undefined;
  pagination: Pagination | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onViewDetection: (detectionId: number) => void;
  onDeleteDetection: (detectionId: number) => void;
  onDownloadReport: (detectionId: number) => void;
  isDeletingDetection: boolean;
}

// Short labels for compact display
const TRAIT_SHORT_LABELS: Record<string, string> = {
  openness: "O",
  conscientiousness: "C",
  extraversion: "E",
  agreeableness: "A",
  neuroticism: "N",
} as const;

// =============================================================================
// Sub-components
// =============================================================================

interface ScoreBadgeProps {
  trait: string;
  score: number;
}

function ScoreBadge({ trait, score }: ScoreBadgeProps) {
  const config = TRAIT_CONFIG[trait];
  const shortLabel = TRAIT_SHORT_LABELS[trait];

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-md ${config.bgColor}`}
      title={`${config.label}: ${score.toFixed(1)}%`}
    >
      <span className={`text-xs font-bold ${config.textColor}`}>
        {shortLabel}
      </span>
      <span className={`text-xs ${config.textColor}`}>{Math.round(score)}</span>
    </div>
  );
}

interface MiniOceanChartProps {
  scores: OceanScores;
}

function MiniOceanChart({ scores }: MiniOceanChartProps) {
  return (
    <div className="flex gap-1">
      {TRAIT_KEYS.map((trait) => (
        <ScoreBadge
          key={trait}
          trait={trait}
          score={scores[trait as keyof OceanScores]}
        />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((j) => (
              <Skeleton key={j} className="h-6 w-10" />
            ))}
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">No detections found</p>
    </div>
  );
}

interface DetectionRowProps {
  detection: DetectionItem;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function DetectionRow({
  detection,
  onView,
  onDownload,
  onDelete,
}: DetectionRowProps) {
  const formattedDate = formatDate(detection.created_at, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              {getInitials(detection.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900">{detection.name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {detection.age && <span>{detection.age} years</span>}
              {detection.gender && (
                <>
                  <span>•</span>
                  <span className="capitalize">{detection.gender}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {detection.user ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {detection.user.name}
              </p>
              <p className="text-xs text-gray-500">{detection.user.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell>
        <MiniOceanChart scores={detection.results} />
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-500">{formattedDate}</span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <FileText className="h-4 w-4 mr-2" />
              Download Report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

interface PaginationControlsProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  itemName?: string;
}

function PaginationControls({
  pagination,
  onPageChange,
  itemName = "items",
}: PaginationControlsProps) {
  if (pagination.total_pages <= 1) {
    return null;
  }

  const startItem = (pagination.page - 1) * pagination.per_page + 1;
  const endItem = Math.min(
    pagination.page * pagination.per_page,
    pagination.total_items,
  );

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500">
        Showing {startItem} to {endItem} of {pagination.total_items} {itemName}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.has_prev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">
          Page {pagination.page} of {pagination.total_pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.has_next}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DetectionsList({
  detections,
  pagination,
  isLoading,
  onPageChange,
  onSearch,
  onViewDetection,
  onDeleteDetection,
  onDownloadReport,
  isDeletingDetection,
}: DetectionsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detectionToDelete, setDetectionToDelete] =
    useState<DetectionItem | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleDeleteClick = (detection: DetectionItem) => {
    setDetectionToDelete(detection);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (detectionToDelete) {
      onDeleteDetection(detectionToDelete.id);
      setDeleteDialogOpen(false);
      setDetectionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDetectionToDelete(null);
  };

  return (
    <>
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Detections Management
            </CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : !detections || detections.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>OCEAN Scores</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detections.map((detection) => (
                      <DetectionRow
                        key={detection.id}
                        detection={detection}
                        onView={() => onViewDetection(detection.id)}
                        onDownload={() => onDownloadReport(detection.id)}
                        onDelete={() => handleDeleteClick(detection)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && (
                <PaginationControls
                  pagination={pagination}
                  onPageChange={onPageChange}
                  itemName="detections"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Detection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the detection for{" "}
              <span className="font-semibold">{detectionToDelete?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeletingDetection}
            >
              {isDeletingDetection ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
