import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { ValidationError, VALID_REGULATIONS, VALID_STATUSES, oneOf } from "@/lib/validation";
import {
  DUE_SOON_WINDOW_DAYS,
  daysUntil,
  isDueSoon,
  isOverdue,
  isReReviewDue,
  todayIso,
} from "@/lib/deadlines";
import { RISK_BANDS, riskBand } from "@/lib/risk";
import type {
  ComplianceDeadlineItem,
  ComplianceMetrics,
  DepartmentCount,
  RegulationCount,
  RiskBand,
  RiskBandCount,
} from "@/lib/types";

/// Severity bands are shared with the dashboard so a risk never shows up as
/// one level on one screen and another level elsewhere. See src/lib/risk.ts.

/// Risks in these states no longer need tracking. Anything else (open,
/// mitigating, accepted) counts as open exposure, matching the dashboard.
const CLOSED_RISK_STATUSES = ["resolved"];

const DAY_MS = 86_400_000;

function toDeadlineItem(
  assessment: {
    id: string;
    title: string;
    regulation: string;
    status: string;
    department: string;
    assigneeId: string;
    dueDate: string;
    reviewCycle: number;
    reviewDueDate: string | null;
    assignee?: { name: string } | null;
  },
  deadline: string,
  today: string
): ComplianceDeadlineItem {
  return {
    id: assessment.id,
    title: assessment.title,
    regulation: assessment.regulation,
    status: assessment.status,
    department: assessment.department,
    assigneeId: assessment.assigneeId,
    assigneeName: assessment.assignee?.name ?? "Unassigned",
    dueDate: assessment.dueDate,
    reviewCycle: assessment.reviewCycle,
    reviewDueDate: assessment.reviewDueDate,
    daysRemaining: daysUntil(deadline, today) ?? 0,
  };
}

function averageCycleTime(
  assessments: { createdAt: Date; completedAt: Date | null }[]
): number | null {
  const spans = assessments
    .filter((a) => a.completedAt !== null)
    .map((a) => (a.completedAt as Date).getTime() - a.createdAt.getTime())
    // Clock skew or a back-dated completion would otherwise skew the mean.
    .filter((ms) => ms >= 0)
    .map((ms) => ms / DAY_MS);

  if (spans.length === 0) return null;

  const mean = spans.reduce((sum, days) => sum + days, 0) / spans.length;
  return Math.round(mean * 10) / 10;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const isReviewer = role === "admin" || role === "privacy_officer" || role === "reviewer";
  // Reviewers, privacy officers and admins get the full report; everyone else
  // (viewers, assessors) gets headline numbers without the internal detail.
  const scope = isReviewer ? "full" : "summary";

  let regulation: string | null = null;
  const requested = new URL(request.url).searchParams.get("regulation");

  if (requested) {
    try {
      regulation = oneOf(requested, "Regulation", VALID_REGULATIONS);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  }

  const today = todayIso();

  const [allAssessments, risks, activeUsers] = await Promise.all([
    prisma.assessment.findMany({
      include: { assignee: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    // Risks are organisation-wide: they are not directly scoped to a single
    // regulation, so the filter only narrows the assessment-derived metrics.
    prisma.risk.findMany({
      select: { id: true, likelihood: true, impact: true, status: true },
    }),
    prisma.user.count({ where: { active: true } }),
  ]);

  const assessments = regulation
    ? allAssessments.filter((a) => a.regulation === regulation)
    : allAssessments;

  const byStatus: Record<string, number> = {};
  for (const status of VALID_STATUSES) byStatus[status] = 0;
  for (const assessment of assessments) {
    byStatus[assessment.status] = (byStatus[assessment.status] ?? 0) + 1;
  }

  const overdue = assessments.filter((a) => isOverdue(a, today));
  const dueSoon = assessments.filter((a) => isDueSoon(a, today, DUE_SOON_WINDOW_DAYS));
  const reReviewDue = assessments.filter((a) => isReReviewDue(a, today));

  const closedAssessments = assessments.filter(
    (a) => a.status === "approved" || a.status === "closed"
  ).length;

  const openRisks = risks.filter((r) => !CLOSED_RISK_STATUSES.includes(r.status));

  const bandCounts = new Map<RiskBand, number>(
    RISK_BANDS.map((b): [RiskBand, number] => [b.band, 0])
  );
  let scoreSum = 0;

  for (const risk of openRisks) {
    const score = risk.likelihood * risk.impact;
    bandCounts.set(riskBand(score), (bandCounts.get(riskBand(score)) ?? 0) + 1);
    scoreSum += score;
  }

  const bands: RiskBandCount[] = RISK_BANDS.map((band) => ({
    ...band,
    count: bandCounts.get(band.band) ?? 0,
    percentage: openRisks.length
      ? Math.round(((bandCounts.get(band.band) ?? 0) / openRisks.length) * 100)
      : 0,
  }));

  const byRegulation: RegulationCount[] = VALID_REGULATIONS.map((key) => {
    const scoped = allAssessments.filter((a) => a.regulation === key);
    return {
      regulation: key,
      total: scoped.length,
      open: scoped.filter((a) => a.status !== "approved" && a.status !== "closed").length,
      closed: scoped.filter((a) => a.status === "approved" || a.status === "closed").length,
      overdue: scoped.filter((a) => isOverdue(a, today)).length,
    };
  });

  const departments = new Map<string, { total: number; open: number; closed: number; overdue: number }>();
  for (const assessment of assessments) {
    const bucket = departments.get(assessment.department) ?? { total: 0, open: 0, closed: 0, overdue: 0 };
    bucket.total += 1;
    if (assessment.status === "approved" || assessment.status === "closed") bucket.closed += 1;
    else bucket.open += 1;
    if (isOverdue(assessment, today)) bucket.overdue += 1;
    departments.set(assessment.department, bucket);
  }

  const byDepartment: DepartmentCount[] | null = isReviewer
    ? [...departments.entries()]
        .map(([department, counts]) => ({ department, ...counts }))
        .sort((a, b) => b.total - a.total || a.department.localeCompare(b.department))
    : null;

  const payload: ComplianceMetrics = {
    generatedAt: new Date().toISOString(),
    today,
    role,
    scope,
    regulation,
    totals: {
      assessments: assessments.length,
      openAssessments: assessments.length - closedAssessments,
      closedAssessments,
      complianceRate: assessments.length
        ? Math.round((closedAssessments / assessments.length) * 100)
        : 0,
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      reReviewDueCount: reReviewDue.length,
      risks: risks.length,
      openRisks: openRisks.length,
      users: activeUsers,
    },
    byStatus,
    byRegulation,
    overdue: isReviewer
      ? overdue.map((a) => toDeadlineItem(a, a.dueDate, today))
      : [],
    dueSoon: isReviewer
      ? dueSoon.map((a) => toDeadlineItem(a, a.dueDate, today))
      : [],
    reReviewDue: isReviewer
      ? reReviewDue.map((a) => toDeadlineItem(a, a.reviewDueDate ?? a.dueDate, today))
      : [],
    riskExposure: isReviewer
      ? {
          openTotal: openRisks.length,
          closedTotal: risks.length - openRisks.length,
          averageScore: openRisks.length
            ? Math.round((scoreSum / openRisks.length) * 10) / 10
            : null,
          bands,
        }
      : null,
    averageCycleTimeDays: isReviewer ? averageCycleTime(assessments) : null,
    byDepartment,
  };

  return NextResponse.json(payload);
}
