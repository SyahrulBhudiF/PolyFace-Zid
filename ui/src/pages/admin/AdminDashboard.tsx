import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Brain,
  LayoutDashboard,
  Users,
  LogOut,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/stores/auth";
import {
  useStatistics,
  useUsers,
  useDetections,
  useUpdateUserRole,
  useDeleteUser,
  useDeleteDetection,
  downloadReport,
} from "@/lib/admin-api";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { UsersList } from "@/components/admin/UsersList";
import { DetectionsList } from "@/components/admin/DetectionsList";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import { DetectionDetailModal } from "@/components/admin/DetectionDetailModal";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [detectionsPage, setDetectionsPage] = useState(1);
  const [detectionsSearch, setDetectionsSearch] = useState("");

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedDetectionId, setSelectedDetectionId] = useState<number | null>(
    null,
  );
  const [detectionDetailOpen, setDetectionDetailOpen] = useState(false);

  const { data: statistics, isLoading: statsLoading } = useStatistics();
  const { data: usersData, isLoading: usersLoading } = useUsers({
    page: usersPage,
    perPage: 10,
    search: usersSearch,
  });
  const { data: detectionsData, isLoading: detectionsLoading } = useDetections({
    page: detectionsPage,
    perPage: 10,
    search: detectionsSearch,
  });

  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();
  const deleteDetectionMutation = useDeleteDetection();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const handleBackToApp = () => {
    navigate({ to: "/" });
  };

  const handleViewUser = (userId: number) => {
    setSelectedUserId(userId);
    setUserDetailOpen(true);
  };

  const handleViewDetection = (detectionId: number) => {
    setSelectedDetectionId(detectionId);
    setDetectionDetailOpen(true);
  };

  const handleDownloadReport = (detectionId: number) => {
    downloadReport(detectionId);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToApp}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  OCEAN Personality System
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/70 backdrop-blur rounded-xl px-4 py-2 shadow-sm">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                  {user?.name ? getInitials(user.name) : "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="bg-white/70 backdrop-blur rounded-xl p-2 shadow-sm w-fit">
            <TabsList className="bg-transparent">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="detections" className="gap-2">
                <Brain className="h-4 w-4" />
                Detections
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <DashboardOverview
              statistics={statistics}
              isLoading={statsLoading}
            />
          </TabsContent>

          <TabsContent value="users">
            <UsersList
              users={usersData?.users}
              pagination={usersData?.pagination}
              isLoading={usersLoading}
              onPageChange={setUsersPage}
              onSearch={(s) => {
                setUsersSearch(s);
                setUsersPage(1);
              }}
              onViewUser={handleViewUser}
              onUpdateRole={(id, role) =>
                updateRoleMutation.mutate({ userId: id, role })
              }
              onDeleteUser={(id) => deleteUserMutation.mutate(id)}
              isUpdatingRole={updateRoleMutation.isPending}
              isDeletingUser={deleteUserMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="detections">
            <DetectionsList
              detections={detectionsData?.detections}
              pagination={detectionsData?.pagination}
              isLoading={detectionsLoading}
              onPageChange={setDetectionsPage}
              onSearch={(s) => {
                setDetectionsSearch(s);
                setDetectionsPage(1);
              }}
              onViewDetection={handleViewDetection}
              onDeleteDetection={(id) => deleteDetectionMutation.mutate(id)}
              onDownloadReport={handleDownloadReport}
              isDeletingDetection={deleteDetectionMutation.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>

      <UserDetailModal
        userId={selectedUserId}
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
      />

      <DetectionDetailModal
        detectionId={selectedDetectionId}
        open={detectionDetailOpen}
        onOpenChange={setDetectionDetailOpen}
        onDownloadReport={handleDownloadReport}
      />
    </div>
  );
}
