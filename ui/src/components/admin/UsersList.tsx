import { useState } from "react";
import {
  Search,
  MoreHorizontal,
  Trash2,
  Shield,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { User as UserType, Pagination } from "@/types/admin";

interface UsersListProps {
  users: UserType[] | undefined;
  pagination: Pagination | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onViewUser: (userId: number) => void;
  onUpdateRole: (userId: number, role: "admin" | "user") => void;
  onDeleteUser: (userId: number) => void;
  isUpdatingRole: boolean;
  isDeletingUser: boolean;
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
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

export function UsersList({
  users,
  pagination,
  isLoading,
  onPageChange,
  onSearch,
  onViewUser,
  onUpdateRole,
  onDeleteUser,
  isUpdatingRole,
  isDeletingUser,
}: UsersListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [userToUpdateRole, setUserToUpdateRole] = useState<{
    user: UserType;
    newRole: "admin" | "user";
  } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleDeleteClick = (user: UserType) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleRoleClick = (user: UserType, newRole: "admin" | "user") => {
    setUserToUpdateRole({ user, newRole });
    setRoleDialogOpen(true);
  };

  const handleConfirmRoleUpdate = () => {
    if (userToUpdateRole) {
      onUpdateRole(userToUpdateRole.user.id, userToUpdateRole.newRole);
      setRoleDialogOpen(false);
      setUserToUpdateRole(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Users Management
            </CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
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
          ) : !users || users.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Detections</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            className={
                              user.role === "admin"
                                ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                : ""
                            }
                          >
                            {user.role === "admin" && (
                              <Shield className="h-3 w-3 mr-1" />
                            )}
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">
                            {user.detection_count ?? 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onViewUser(user.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.role === "user" ? (
                                <DropdownMenuItem
                                  onClick={() => handleRoleClick(user, "admin")}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleRoleClick(user, "user")}
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Remove Admin
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(user)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.per_page + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.per_page,
                      pagination.total_items
                    )}{" "}
                    of {pagination.total_items} users
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{userToDelete?.name}</span>? This
              will also delete all their detection history. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeletingUser}
            >
              {isDeletingUser ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Update Confirmation Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {userToUpdateRole?.newRole === "admin"
                ? "make"
                : "remove admin privileges from"}{" "}
              <span className="font-semibold">
                {userToUpdateRole?.user.name}
              </span>
              {userToUpdateRole?.newRole === "admin"
                ? " an admin? They will have full access to the admin dashboard."
                : "? They will no longer have access to the admin dashboard."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRoleUpdate}
              disabled={isUpdatingRole}
            >
              {isUpdatingRole ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
