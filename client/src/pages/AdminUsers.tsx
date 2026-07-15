import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Users,
  ShieldCheck,
  FileText,
  ArrowLeft,
  Search,
  Crown,
  UserMinus,
  Loader2,
  Calendar,
  Clock,
  History,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  loginMethod: string | null;
  organizationId: string | null;
  organizationName: string | null;
  participantId: string | null;
  createdAt: Date;
  lastSignedIn: Date;
  idpCount: number;
  lastIdpGenerated: Date | null;
};

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: number;
    userName: string;
    newRole: "user" | "admin";
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "auditLog">("users");

  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const { data: auditLog, isLoading: auditLoading } = trpc.admin.getAuditLog.useQuery(undefined, {
    enabled: user?.role === "admin" && activeTab === "auditLog",
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully.");
      refetch();
      setConfirmDialog(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update role.");
    },
  });

  // Redirect non-admins
  if (!authLoading && user && user.role !== "admin") {
    setLocation("/");
    return null;
  }

  if (!authLoading && !user) {
    setLocation("/");
    return null;
  }

  const filteredUsers = (users as UserRow[] | undefined)?.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.organizationName?.toLowerCase().includes(q) ||
      u.organizationId?.toLowerCase().includes(q) ||
      u.participantId?.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleRoleChange = (userId: number, userName: string, newRole: "user" | "admin") => {
    setConfirmDialog({ open: true, userId, userName, newRole });
  };

  const confirmRoleChange = () => {
    if (!confirmDialog) return;
    updateRoleMutation.mutate({ userId: confirmDialog.userId, role: confirmDialog.newRole });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              className="transition-all duration-200 hover:scale-105"
              aria-label="Back to Dashboard"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029322203/HPcFanTDeMMosnOA.png"
              alt="Emeritus"
              className="h-8 object-contain"
            />
          </div>
          <Badge variant="secondary" className="gap-1 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin Panel
          </Badge>
        </div>
      </header>

      <main className="container py-8 max-w-7xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-2">
            View all registered users, manage roles, and monitor IDP generation activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats?.totalUsers ?? "—"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total IDPs Generated</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats?.totalIdps ?? "—"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Admin Users</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {stats?.adminCount ?? "—"}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("auditLog")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "auditLog"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            Activity Log
          </button>
        </div>

        {/* User Table */}
        {activeTab === "users" && <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-xl">Registered Users</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading users...</span>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead className="text-center">IDPs Generated</TableHead>
                      <TableHead>Last IDP</TableHead>
                      <TableHead>Member Since</TableHead>
                      <TableHead>Last Sign-in</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id} className="transition-colors hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {u.name || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {u.email || "No email"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {u.role === "admin" ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                                <Crown className="h-3 w-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Users className="h-3 w-3" />
                                User
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-2 text-sm">
                              <Building2 className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-foreground">{u.organizationName || "Unassigned"}</p>
                                {u.participantId && (
                                  <p className="text-xs text-muted-foreground">Participant: {u.participantId}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                              {Number(u.idpCount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              {formatDate(u.lastIdpGenerated)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(u.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(u.lastSignedIn)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {u.role === "admin" ? (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleRoleChange(u.id, u.name || "this user", "user")}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                                disabled={u.id === user?.id}
                                aria-label="Demote user"
                                title={u.id === user?.id ? "You cannot demote yourself" : "Demote user"}
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleRoleChange(u.id, u.name || "this user", "admin")}
                                className="text-amber-600 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
                                aria-label="Promote user"
                                title="Promote user"
                              >
                                <Crown className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          {searchQuery ? "No users match your search." : "No users registered yet."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Audit Log Tab */}
        {activeTab === "auditLog" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Role Change Activity Log
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                A timestamped history of all admin role promotions and demotions.
              </p>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading activity log...</span>
                </div>
              ) : auditLog && auditLog.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Changed By</TableHead>
                        <TableHead>User Affected</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Date &amp; Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLog.map((entry) => (
                        <TableRow key={entry.id} className="transition-colors hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                              </div>
                              <span className="font-medium text-sm">{entry.actorName || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{entry.targetUserName || "Unknown"}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {entry.oldRole === "admin" ? "Admin" : "User"}
                              </Badge>
                              <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                              <Badge
                                className={`text-xs ${
                                  entry.newRole === "admin"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                                }`}
                              >
                                {entry.newRole === "admin" ? "Admin" : "User"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(entry.createdAt).toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <History className="h-12 w-12 opacity-30" />
                  <p className="text-base">No role changes recorded yet.</p>
                  <p className="text-sm">Activity will appear here when admin roles are promoted or demoted.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Confirm Role Change Dialog */}
      <Dialog open={confirmDialog?.open ?? false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.newRole === "admin" ? "Promote to Admin?" : "Demote to User?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.newRole === "admin"
                ? `This will grant ${confirmDialog?.userName} full admin access to this panel, user management, and all IDP records.`
                : `This will remove admin privileges from ${confirmDialog?.userName}. They will no longer have access to this panel.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="icon" onClick={() => setConfirmDialog(null)} aria-label="Cancel" title="Cancel">
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant={confirmDialog?.newRole === "admin" ? "default" : "destructive"}
              onClick={confirmRoleChange}
              disabled={updateRoleMutation.isPending}
              size="icon"
              aria-label={confirmDialog?.newRole === "admin" ? "Promote" : "Demote"}
              title={confirmDialog?.newRole === "admin" ? "Promote" : "Demote"}
            >
              {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {!updateRoleMutation.isPending && (confirmDialog?.newRole === "admin" ? <Crown className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
