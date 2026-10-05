"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ClipboardCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Activity,
  TriangleAlert,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { api, formatDate, formatDateTime } from "@/lib/storage";
import {
  describeDeadline,
  daysUntil,
  dueBucket,
  formatDay,
  todayIso,
} from "@/lib/deadlines";
import { Card, Badge, ProgressBar, PageHeader, Button } from "@/components/ui";
import { regulations } from "@/data/organization";
import { riskBand, riskScore } from "@/lib/risk";
import type { Assessment, Risk, ActivityLog } from "@/lib/types";

const statusColors: Record<string, "blue" | "green" | "yellow" | "red" | "slate"> = {
  draft: "slate",
  in_review: "blue",
  approved: "green",
  rejected: "red",
  closed: "green",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
};

function DeadlineRow({ assessment, today }: { assessment: Assessment; today: string }) {
  const days = daysUntil(assessment.dueDate, today) ?? 0;
  const reg = regulations.find((r) => r.key === assessment.regulation);

  return (
    <Link
      href={`/assessments/${assessment.id}`}
      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {assessment.title}
        </p>
        <p className="text-xs text-slate-500">
          {assessment.department} · {assessment.assigneeName} · {formatDay(assessment.dueDate)}
        </p>
      </div>
      <Badge color={reg ? "blue" : "slate"}>{assessment.regulation}</Badge>
      <Badge color={statusColors[assessment.status]}>{statusLabels[assessment.status]}</Badge>
      <span
        className={`w-28 flex-none text-right text-xs font-medium ${
          days < 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {describeDeadline(days)}
      </span>
      <ChevronRight className="h-4 w-4 flex-none text-slate-300" />
    </Link>
  );
}

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [today, setToday] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [a, r, act] = await Promise.all([
          api.getAssessments(),
          api.getRisks(),
          api.getActivities(),
        ]);
        if (!cancelled) {
          setAssessments(a);
          setRisks(r);
          setActivities(act);
          setToday(todayIso());
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = assessments.length;
    const inReview = assessments.filter((a) => a.status === "in_review").length;
    const draft = assessments.filter((a) => a.status === "draft").length;
    const closed = assessments.filter((a) => a.status === "closed" || a.status === "approved").length;
    const openRisks = risks.filter((r) => r.status !== "resolved").length;
    const highRisks = risks.filter(
      (r) => r.status !== "resolved" && (riskBand(riskScore(r.likelihood, r.impact)) === "high" || riskBand(riskScore(r.likelihood, r.impact)) === "critical")
    ).length;
    const complianceRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return { total, inReview, draft, closed, openRisks, highRisks, complianceRate };
  }, [assessments, risks]);

  const regulationDistribution = useMemo(() => {
    const dist = regulations.map((reg) => {
      const count = assessments.filter((a) => a.regulation === reg.key).length;
      return { ...reg, count };
    });
    const max = Math.max(...dist.map((d) => d.count), 1);
    return dist.map((d) => ({ ...d, percentage: (d.count / max) * 100 }));
  }, [assessments]);

  const recentActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5),
    [activities]
  );

  // Deadline watch: everything past its due date, plus what lands in the next
  // 14 days, so at-risk work is visible without digging into each assessment.
  const deadlineWatch = useMemo(() => {
    if (!today) return { overdue: [], dueSoon: [] };

    const byDeadline = (a: Assessment, b: Assessment) =>
      (daysUntil(a.dueDate, today) ?? 0) - (daysUntil(b.dueDate, today) ?? 0);

    const overdue = assessments
      .filter((a) => dueBucket(a, today) === "overdue")
      .sort(byDeadline);

    const dueSoon = assessments
      .filter((a) => dueBucket(a, today) === "due_soon")
      .sort(byDeadline);

    return { overdue, dueSoon };
  }, [assessments, today]);

  const { data: session } = useSession();

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${session?.user?.name?.split(" ")[0] ?? "there"}`}
        description="Here's an overview of your privacy operations"
        actions={
          <Link href="/assessments/new">
            <Button>
              <ClipboardCheck className="h-4 w-4" />
              New Assessment
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Assessments</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-950">
              <ClipboardCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-green-600">{stats.closed} closed</span> · {stats.draft} drafts
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Open Risks</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.openRisks}</p>
            </div>
            <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-950">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-red-600">{stats.highRisks} high priority</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">In Review</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.inReview}</p>
            </div>
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-950">
              <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Awaiting review</div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Compliance Rate</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.complianceRate}%</p>
            </div>
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-950">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-green-600">↑ 12%</span> vs last quarter
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Regulation distribution */}
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Regulation Coverage</h3>
            <div className="space-y-4">
              {regulationDistribution.map((reg) => (
                <div key={reg.key} className="flex items-center gap-4">
                  <span className="w-14 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">{reg.key}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, reg.percentage)}%`,
                        backgroundColor: reg.color,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {reg.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent assessments */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Assessments</h3>
              <Link href="/assessments" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {assessments.slice(0, 4).map((a) => {
                const reg = regulations.find((r) => r.key === a.regulation);
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{a.title}</p>
                      <p className="text-xs text-slate-500">
                        {a.stakeholder} · Due {formatDate(a.dueDate)}
                      </p>
                    </div>
                    <Badge color={reg ? "blue" : "slate"}>{a.regulation}</Badge>
                    <Badge color={statusColors[a.status]}>{statusLabels[a.status]}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Active risks */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Priority Risks</h3>
              <Link href="/risks" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {risks
                .filter((r) => r.status !== "resolved")
                .sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact)
                .slice(0, 4)
                .map((risk) => {
                  const score = riskScore(risk.likelihood, risk.impact);
                  const level = riskBand(score);
                  return (
                    <div key={risk.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{risk.title}</p>
                        <Badge color={level === "high" ? "red" : level === "medium" ? "yellow" : "green"}>
                          {level.toUpperCase()}
                        </Badge>
                      </div>
                      <ProgressBar value={(score / 25) * 100} color={level === "high" ? "red" : level === "medium" ? "yellow" : "green"} className="mt-2" />
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* Recent activity */}
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Activity className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-medium">{act.action}</span> — {act.entity}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(act.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Deadline watch */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <TriangleAlert className="h-4 w-4 text-red-500" />
              Overdue
            </h3>
            <div className="flex items-center gap-3">
              <Badge color={deadlineWatch.overdue.length > 0 ? "red" : "green"}>
                {deadlineWatch.overdue.length}
              </Badge>
              <Link
                href="/compliance"
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Compliance report <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          {deadlineWatch.overdue.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Nothing overdue — every outstanding assessment is within its due date.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {deadlineWatch.overdue.slice(0, 5).map((a) => (
                <DeadlineRow key={a.id} assessment={a} today={today} />
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Due Soon
            </h3>
            <Badge color={deadlineWatch.dueSoon.length > 0 ? "yellow" : "green"}>
              {deadlineWatch.dueSoon.length}
            </Badge>
          </div>
          {deadlineWatch.dueSoon.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No assessments are due in the next 14 days.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {deadlineWatch.dueSoon.slice(0, 5).map((a) => (
                <DeadlineRow key={a.id} assessment={a} today={today} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
