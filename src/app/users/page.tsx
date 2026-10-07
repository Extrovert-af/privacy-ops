"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Mail, UserPlus, UserX, KeyRound } from "lucide-react";
import { api } from "@/lib/storage";
import { Card, Badge, Button, Modal, PageHeader } from "@/components/ui";
import type { User, UserRole } from "@/lib/types";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  privacy_officer: "Privacy Officer",
  reviewer: "Reviewer",
  assessor: "Assessor",
  viewer: "Viewer",
};

const roleColors: Record<UserRole, "purple" | "blue" | "green" | "yellow" | "slate"> = {
  admin: "purple",
  privacy_officer: "blue",
  reviewer: "green",
  assessor: "yellow",
  viewer: "slate",
};

const roleDescriptions: Record<UserRole, string> = {
  admin: "Full access - manage users, settings, and all workflows",
  privacy_officer: "Review and approve PIA/DPIA assessments, manage DPO responsibilities",
  reviewer: "Review assessments and evaluate risks, provide feedback",
  assessor: "Create and complete assessments, identify risks",
  viewer: "Read-only access to assessments, reports, and documents",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "viewer" as UserRole,
    department: "",
  });

  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = status === "authenticated" && session?.user?.role === "admin";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (isAdmin) api.getUsers().then((u) => setUsers(u)).catch(() => {});
  }, [isAdmin]);

  const handleAddUser = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setAdding(true);
    setErrorMsg("");
    try {
      const newUser = await api.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department || "Unassigned",
      });
      setUsers((prev) => [...prev, newUser]);
      setShowModal(false);
      setForm({ name: "", email: "", role: "viewer", department: "" });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (user: User) => {
    const updated = await api.updateUser(user.id, { active: !user.active });
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const openReset = (user: User) => {
    setResetTarget(user);
    setResetPassword("");
    setResetConfirm("");
    setResetError("");
  };

  const handleReset = async () => {
    if (!resetTarget) return;

    if (resetPassword.length < 8) {
      setResetError("New password must be at least 8 characters.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("New passwords do not match.");
      return;
    }

    setResetting(true);
    setResetError("");
    try {
      await api.changePassword(resetTarget.id, undefined, resetPassword);
      setResetTarget(null);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Could not reset password.");
    } finally {
      setResetting(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  if (!isAdmin) return null;

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage team members and their permissions"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        }
      />

      {/* Role permissions summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        {(Object.keys(roleLabels) as UserRole[]).map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <Card key={role} className="p-4">
              <div className="flex items-center justify-between">
                <Badge color={roleColors[role]}>{roleLabels[role]}</Badge>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{count}</span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">{roleDescriptions[role]}</p>
            </Card>
          );
        })}
      </div>

      {/* User list */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-4 p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: user.avatarColor }}
              >
                {getInitials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                  {!user.active && <Badge color="red">Inactive</Badge>}
                </div>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Mail className="h-3 w-3" /> {user.email} · {user.department}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                <button
                  onClick={() => openReset(user)}
                  className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
                  title="Reset password"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive(user)}
                  className={`rounded p-1.5 transition-colors ${
                    user.active
                      ? "text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      : "text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  }`}
                  title={user.active ? "Deactivate" : "Activate"}
                >
                  {user.active ? <UserX className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add user modal */}
      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title="Add Team Member"
        description="Create a new user account"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., John Smith"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="e.g., john@company.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="e.g., Legal & Compliance"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                <option key={role} value={role}>{roleLabels[role]}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">{roleDescriptions[form.role]}</p>
          </div>
          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
              {errorMsg}
            </div>
          )}
          <Button className="w-full" onClick={handleAddUser} disabled={!form.name.trim() || !form.email.trim() || adding}>
            <UserPlus className="h-4 w-4" /> {adding ? "Adding..." : "Add User"}
          </Button>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={resetTarget !== null}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null);
        }}
        title="Reset Password"
        description={resetTarget ? `Set a new password for ${resetTarget.name}` : undefined}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Confirm New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <p className="text-xs text-slate-400">
            They will need this new password to sign in. The change is recorded
            in the activity log.
          </p>
          {resetError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
              {resetError}
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleReset}
            disabled={!resetPassword || !resetConfirm || resetting}
          >
            <KeyRound className="h-4 w-4" /> {resetting ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
