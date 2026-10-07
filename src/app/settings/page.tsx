"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api } from "@/lib/storage";
import { Card, Badge, Button, PageHeader } from "@/components/ui";
import type { UserRole } from "@/lib/types";

type BadgeColor = "purple" | "blue" | "green" | "yellow" | "slate";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  privacy_officer: "Privacy Officer",
  reviewer: "Reviewer",
  assessor: "Assessor",
  viewer: "Viewer",
};

const roleColors: Record<UserRole, BadgeColor> = {
  admin: "purple",
  privacy_officer: "blue",
  reviewer: "green",
  assessor: "yellow",
  viewer: "slate",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) return;

    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (next === current) {
      setError("Choose a password different from your current one.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(user.id, current, next);
      setSuccess("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  const role = (user?.role ?? "viewer") as UserRole;

  return (
    <div>
      <PageHeader
        title="Account Settings"
        description="Manage your profile and password"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Your Account
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{user?.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="truncate font-medium text-slate-900 dark:text-slate-100">{user?.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Role</dt>
              <dd>
                <Badge color={roleColors[role]}>{roleLabels[role]}</Badge>
              </dd>
            </div>
          </dl>
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none" />
            Only an admin can change your email or role. Ask them if any of this
            is wrong.
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Change Password
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Current Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Confirm New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md border border-green-200 bg-green-50 p-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400">
                {success}
              </div>
            )}

            <Button type="submit" disabled={!current || !next || !confirm || saving}>
              <KeyRound className="h-4 w-4" />
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
