"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  RefreshCw,
  ShieldAlert,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { api, formatDateTime } from "@/lib/storage";
import { describeDeadline, formatDay } from "@/lib/deadlines";
import { Badge, Button, Card, PageHeader, ProgressBar } from "@/components/ui";
import { regulations } from "@/data/organization";
import type {
  ComplianceDeadlineItem,
  ComplianceMetrics,
  RegulationKey,
  RiskBand,
} from "@/lib/types";

const statusMeta = [
  { key: "draft", label: "Draft", color: "slate", bar: "blue" },
  { key: "in_review", label: "In Review", color: "blue", bar: "blue" },
  { key: "approved", label: "Approved", color: "green", bar: "green" },
  { key: "rejected", label: "Rejected", color: "red", bar: "red" },
  { key: "closed", label: "Closed", color: "green", bar: "green" },
] as const satisfies readonly {
  key: string;
  label: string;
  color: "slate" | "blue" | "green" | "yellow" | "red";
  bar: "blue" | "green" | "yellow" | "red";
}[];

const tileTones = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  red: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  green: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
} as const;

const bandBarColor: Record<RiskBand, "green" | "yellow" | "red"> = {
  low: "green",
  medium: "yellow",
  high: "red",
  critical: "red",
};

const bandBadgeColor: Record<RiskBand, "green" | "yellow" | "red"> = {
  low: "green",
  medium: "yellow",
  high: "red",
  critical: "red",
};

type Filter = RegulationKey | "all";

/// `describeDeadline` reads as an assessment deadline; for the re-review column
/// the same number is the time since the review date passed.
function describeOverdue(days: number): string {
  if (days <= -1) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past review date`;
  return describeDeadline(days);
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone: keyof typeof tileTones;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tileTones[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

function DeadlineList({
  items,
  dateKey,
  emptyMessage,
}: {
  items: ComplianceDeadlineItem[];
  dateKey: "dueDate" | "reviewDueDate";
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => {
        const date = dateKey === "dueDate" ? item.dueDate : item.reviewDueDate;
        const overdue = item.daysRemaining < 0;

        return (
          <Link
            key={item.id}
            href={`/assessments/${item.id}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {item.title}
              </p>
              <p className="text-xs text-slate-500">
                {item.department} · {item.assigneeName} ·{" "}
                {dateKey === "dueDate" ? "due" : "re-review due"}{" "}
                {formatDay(date ?? item.dueDate)}
              </p>
            </div>
            <Badge color="blue">{item.regulation}</Badge>
            {item.reviewCycle > 1 && <Badge color="purple">Cycle {item.reviewCycle}</Badge>}
            <span
              className={`w-28 shrink-0 text-right text-xs font-medium ${
                overdue ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {dateKey === "dueDate"
                ? describeDeadline(item.daysRemaining)
                : describeOverdue(item.daysRemaining)}
            </span>
            <ChevronRight className="h-4 w-4 flex-none text-slate-300" />
          </Link>
        );
      })}
    </div>
  );
}

export default function CompliancePage() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");
  const [running, setRunning] = useState(false);

  const load = useCallback(async (regulation: Filter) => {
    try {
      const data = await api.getCompliance(regulation);
      setMetrics(data);
      setErrorMsg("");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load compliance metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      try {
        const data = await api.getCompliance(filter);
        if (!cancelled) {
          setMetrics(data);
          setErrorMsg("");
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : "Failed to load compliance metrics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMetrics();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const refresh = async () => {
    setLoading(true);
    await load(filter);
  };

  const runReminders = async () => {
    setRunning(true);
    setReminderMsg("");
    try {
      const result = await api.runDeadlineNotifications();
      setReminderMsg(
        result.created > 0
          ? `Queued ${result.created} reminder${result.created === 1 ? "" : "s"} for assignees.`
          : `No new reminders needed — ${result.skipped} already sent and unread.`
      );
    } catch (e) {
      setReminderMsg(e instanceof Error ? e.message : "Failed to run deadline reminders");
    } finally {
      setRunning(false);
    }
  };

  const isFullScope = metrics?.scope === "full";
  const maxStatusCount = Math.max(
    ...statusMeta.map((s) => metrics?.byStatus[s.key] ?? 0),
    1
  );

  return (
    <div>
      <PageHeader
        title="Compliance Report"
        description="Programme coverage, deadline health and risk exposure across regulations"
        actions={
          <>
            {isFullScope && (
              <Button variant="secondary" onClick={runReminders} disabled={running}>
                <BellRing className="h-4 w-4" />
                {running ? "Sending..." : "Send deadline reminders"}
              </Button>
            )}
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as Filter);
            setLoading(true);
          }}
          aria-label="Filter by regulation"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All regulations</option>
          {regulations.map((r) => (
            <option key={r.key} value={r.key}>
              {r.key}
            </option>
          ))}
        </select>
        {metrics && (
          <span className="text-xs text-slate-500">
            Generated {formatDateTime(metrics.generatedAt)} · as of {formatDay(metrics.today)}
          </span>
        )}
      </div>

      {reminderMsg && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {reminderMsg}
        </div>
      )}

      {errorMsg ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-red-600">{errorMsg}</p>
          <Button variant="outline" className="mt-4" onClick={refresh}>
            Try again
          </Button>
        </Card>
      ) : loading && !metrics ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">Loading compliance metrics...</p>
        </Card>
      ) : !metrics ? null : (
        <>
          {!isFullScope && (
            <Card className="mb-6 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              You&apos;re seeing the summary view. Named deadlines, department breakdown and
              risk banding are limited to reviewers, privacy officers and admins.
            </Card>
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatTile
              label="Assessments"
              value={metrics.totals.assessments}
              hint={
                metrics.regulation
                  ? `${metrics.regulation} only`
                  : `${metrics.totals.openAssessments} still open`
              }
              icon={ClipboardCheck}
              tone="blue"
            />
            <StatTile
              label="Compliance Rate"
              value={`${metrics.totals.complianceRate}%`}
              hint={`${metrics.totals.closedAssessments} approved or closed`}
              icon={BarChart3}
              tone="green"
            />
            <StatTile
              label="Overdue"
              value={metrics.totals.overdueCount}
              hint="Past the agreed due date"
              icon={TriangleAlert}
              tone="red"
            />
            <StatTile
              label="Due Soon"
              value={metrics.totals.dueSoonCount}
              hint="Next 14 days"
              icon={CalendarClock}
              tone="amber"
            />
            <StatTile
              label="Open Risks"
              value={metrics.totals.openRisks}
              hint={`${metrics.totals.risks} tracked · ${metrics.totals.users} active users`}
              icon={ShieldAlert}
              tone="purple"
            />
            <StatTile
              label="Avg Cycle Time"
              value={
                metrics.averageCycleTimeDays === null
                  ? "—"
                  : `${metrics.averageCycleTimeDays} days`
              }
              hint="Created to closed"
              icon={Timer}
              tone="slate"
            />
          </div>

          {/* Status breakdown + risk exposure */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Status Breakdown
                </h3>
                <span className="text-xs text-slate-500">{metrics.totals.assessments} total</span>
              </div>
              <div className="space-y-4">
                {statusMeta.map((status) => {
                  const count = metrics.byStatus[status.key] ?? 0;
                  return (
                    <div key={status.key}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <Badge color={status.color}>{status.label}</Badge>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {count}
                        </span>
                      </div>
                      <ProgressBar value={(count / maxStatusCount) * 100} color={status.bar} />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Risk Exposure by Band
                </h3>
                {metrics.riskExposure && (
                  <span className="text-xs text-slate-500">
                    Avg score {metrics.riskExposure.averageScore ?? "—"}/25
                  </span>
                )}
              </div>
              {metrics.riskExposure ? (
                <div className="space-y-4">
                  {metrics.riskExposure.bands.map((band) => (
                    <div key={band.band}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge color={bandBadgeColor[band.band]}>{band.label}</Badge>
                          <span className="text-xs text-slate-400">
                            score {band.min}–{band.max}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {band.count}
                        </span>
                      </div>
                      <ProgressBar
                        value={band.percentage}
                        color={bandBarColor[band.band]}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-slate-400">
                    Bands come from likelihood × impact (1–25). {metrics.riskExposure.closedTotal}{" "}
                    tracked risk{metrics.riskExposure.closedTotal === 1 ? " is" : "s are"} resolved.
                  </p>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">
                  Risk banding is available to reviewers, privacy officers and admins.
                </p>
              )}
            </Card>
          </div>

          {/* Regulation coverage */}
          <Card className="mt-6 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Regulation Coverage
              </h3>
              <span className="text-xs text-slate-500">All regulations</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    <th className="px-5 py-2 font-medium">Regulation</th>
                    <th className="px-5 py-2 font-medium">Region</th>
                    <th className="px-5 py-2 font-medium">Total</th>
                    <th className="px-5 py-2 font-medium">Open</th>
                    <th className="px-5 py-2 font-medium">Closed</th>
                    <th className="px-5 py-2 font-medium">Overdue</th>
                    <th className="w-40 px-5 py-2 font-medium">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {metrics.byRegulation.map((row) => {
                    const meta = regulations.find((r) => r.key === row.regulation);
                    const coverage = row.total > 0 ? (row.closed / row.total) * 100 : 0;
                    return (
                      <tr key={row.regulation}>
                        <td className="px-5 py-2.5">
                          <span
                            className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                            style={{ backgroundColor: meta?.color ?? "#94a3b8" }}
                          />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {row.regulation}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-slate-500">{meta?.region ?? "—"}</td>
                        <td className="px-5 py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                          {row.total}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600 dark:text-slate-400">
                          {row.open}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600 dark:text-slate-400">
                          {row.closed}
                        </td>
                        <td
                          className={`px-5 py-2.5 font-medium ${
                            row.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                          }`}
                        >
                          {row.overdue}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <ProgressBar
                              value={coverage}
                              color={row.total === 0 ? "blue" : coverage === 100 ? "green" : "yellow"}
                              className="w-24"
                            />
                            <span className="text-xs text-slate-500">
                              {row.total === 0 ? "—" : `${Math.round(coverage)}%`}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Overdue and due soon */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <TriangleAlert className="h-4 w-4 text-red-500" />
                  Overdue
                </h3>
<Badge color={metrics.totals.overdueCount > 0 ? "red" : "green"}>
              {isFullScope ? metrics.overdue.length : metrics.totals.overdueCount}
            </Badge>
              </div>
              {isFullScope ? (
                <DeadlineList
                  items={metrics.overdue}
                  dateKey="dueDate"
                  emptyMessage="Nothing overdue. Every outstanding assessment is within its due date."
                />
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  {metrics.totals.overdueCount} assessment
                  {metrics.totals.overdueCount === 1 ? " is" : "s are"} overdue. Sign in as a
                  reviewer or privacy officer to see the detail.
                </p>
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between p-5 pb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <CalendarClock className="h-4 w-4 text-amber-500" />
                  Due Soon
                </h3>
                <Badge color={metrics.totals.dueSoonCount > 0 ? "yellow" : "green"}>
                  {isFullScope ? metrics.dueSoon.length : metrics.totals.dueSoonCount}
                </Badge>
              </div>
              {isFullScope ? (
                <DeadlineList
                  items={metrics.dueSoon}
                  dateKey="dueDate"
                  emptyMessage="No assessments are due in the next 14 days."
                />
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">
                  {metrics.totals.dueSoonCount} assessment
                  {metrics.totals.dueSoonCount === 1 ? " is" : "s are"} due in the next 14 days.
                </p>
              )}
            </Card>
          </div>

          {/* Re-review due */}
          <Card className="mt-6 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                Re-Review Due
              </h3>
              <Badge color={metrics.totals.reReviewDueCount > 0 ? "purple" : "green"}>
                {isFullScope ? metrics.reReviewDue.length : metrics.totals.reReviewDueCount}
              </Badge>
            </div>
            {isFullScope ? (
              <DeadlineList
                items={metrics.reReviewDue}
                dateKey="reviewDueDate"
                emptyMessage="No closed assessments are due for re-review."
              />
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                {metrics.totals.reReviewDueCount} closed assessment
                {metrics.totals.reReviewDueCount === 1 ? " is" : "s are"} due for re-review.
              </p>
            )}
          </Card>

          {/* Departments */}
          {metrics.byDepartment && (
            <Card className="mt-6 overflow-hidden">
              <div className="p-5 pb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Department Workload
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                      <th className="px-5 py-2 font-medium">Department</th>
                      <th className="px-5 py-2 font-medium">Assessments</th>
                      <th className="px-5 py-2 font-medium">Open</th>
                      <th className="px-5 py-2 font-medium">Closed</th>
                      <th className="px-5 py-2 font-medium">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {metrics.byDepartment.map((row) => (
                      <tr key={row.department}>
                        <td className="px-5 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {row.department}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600 dark:text-slate-400">
                          {row.total}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600 dark:text-slate-400">
                          {row.open}
                        </td>
                        <td className="px-5 py-2.5 text-slate-600 dark:text-slate-400">
                          {row.closed}
                        </td>
                        <td
                          className={`px-5 py-2.5 font-medium ${
                            row.overdue > 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          {row.overdue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
