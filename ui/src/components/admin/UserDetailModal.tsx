import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, User, Mail, Calendar, Brain, BarChart3 } from "lucide-react";
import { useUserDetail } from "@/lib/admin-api";
import type { OceanScores } from "@/types/admin";

interface UserDetailModalProps {
  userId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function AverageScoresCard({ scores }: { scores: OceanScores }) {
  const traits = [
    { key: "openness", label: "Openness", color: "bg-blue-500" },
    {
      key: "conscientiousness",
      label: "Conscientiousness",
      color: "bg-green-500",
    },
    { key: "extraversion", label: "Extraversion", color: "bg-yellow-500" },
    { key: "agreeableness", label: "Agreeableness", color: "bg-purple-500" },
    { key: "neuroticism", label: "Neuroticism", color: "bg-red-500" },
  ] as const;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-gray-500" />
        <h4 className="font-medium text-gray-700">Average OCEAN Scores</h4>
      </div>
      {traits.map((trait) => (
        <ScoreBar
          key={trait.key}
          label={trait.label}
          value={scores[trait.key]}
          color={trait.color}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-60" />
    </div>
  );
}

export function UserDetailModal({
  userId,
  open,
  onOpenChange,
}: UserDetailModalProps) {
  const { data: user, isLoading } = useUserDetail(open ? userId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : !user ? (
            <div className="text-center py-8 text-gray-500">User not found</div>
          ) : (
            <div className="space-y-6">
              {/* User Profile Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {user.name}
                    </h3>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className={
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : ""
                      }
                    >
                      {user.role === "admin" && (
                        <Shield className="h-3 w-3 mr-1" />
                      )}
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 mt-1">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                </div>
              </div>

              {/* User Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Joined</span>
                  </div>
                  <p className="text-gray-700">{formatDate(user.created_at)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Brain className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Total Detections
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-700">
                    {user.detections?.length ?? user.detection_count ?? 0}
                  </p>
                </div>
              </div>

              {/* Average Scores */}
              {user.average_scores && (
                <AverageScoresCard scores={user.average_scores} />
              )}

              {/* Detection History */}
              {user.detections && user.detections.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-gray-500" />
                    <h4 className="font-medium text-gray-700">
                      Detection History ({user.detections.length})
                    </h4>
                  </div>
                  <div className="rounded-md border max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>O</TableHead>
                          <TableHead>C</TableHead>
                          <TableHead>E</TableHead>
                          <TableHead>A</TableHead>
                          <TableHead>N</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {user.detections.slice(0, 10).map((detection) => (
                          <TableRow key={detection.id}>
                            <TableCell className="font-medium">
                              {detection.name}
                            </TableCell>
                            <TableCell>
                              {detection.results.openness.toFixed(0)}
                            </TableCell>
                            <TableCell>
                              {detection.results.conscientiousness.toFixed(0)}
                            </TableCell>
                            <TableCell>
                              {detection.results.extraversion.toFixed(0)}
                            </TableCell>
                            <TableCell>
                              {detection.results.agreeableness.toFixed(0)}
                            </TableCell>
                            <TableCell>
                              {detection.results.neuroticism.toFixed(0)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {new Date(
                                detection.created_at,
                              ).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {user.detections.length > 10 && (
                    <p className="text-sm text-gray-500 text-center">
                      Showing 10 of {user.detections.length} detections
                    </p>
                  )}
                </div>
              )}

              {(!user.detections || user.detections.length === 0) && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Brain className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No detections yet</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
