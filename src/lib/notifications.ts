import prisma from "@/lib/prisma";
import {
  DUE_SOON_WINDOW_DAYS,
  daysUntil,
  describeDeadline,
  formatDay,
  isDueSoon,
  isOverdue,
  isReReviewDue,
  todayIso,
} from "@/lib/deadlines";
import type { DeadlineRunResult } from "@/lib/types";

export const NOTIFICATION_KINDS = {
  overdue: "deadline_overdue",
  dueSoon: "deadline_due_soon",
  reReviewDue: "re_review_due",
  system: "system",
} as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

export const ALL_NOTIFICATION_KINDS: readonly NotificationKind[] =
  Object.values(NOTIFICATION_KINDS);

/** One notification per (user, kind, assessment) pair. */
type Candidate = {
  userId: string;
  title: string;
  body: string;
  kind: NotificationKind;
  link: string;
};

/**
 * Creates deadline notifications for assessment assignees.
 *
 * Idempotent by design: a notification is only created when the user has no
 * *unread* notification of the same kind pointing at the same assessment, so a
 * scheduler can call this every day without spamming anyone. Once the user
 * reads (or dismisses) the alert, a later run will raise it again if the
 * assessment is still outstanding.
 */
export async function generateDeadlineNotifications(
  options: { today?: string; windowDays?: number } = {}
): Promise<DeadlineRunResult> {
  const today = options.today ?? todayIso();
  const windowDays = options.windowDays ?? DUE_SOON_WINDOW_DAYS;

  // Notifications go to the assignee, which is all this job needs.
  const assessments = await prisma.assessment.findMany();

  const candidates: Candidate[] = [];

  for (const assessment of assessments) {
    const link = `/assessments/${assessment.id}`;

    if (isOverdue(assessment, today)) {
      candidates.push({
        userId: assessment.assigneeId,
        kind: NOTIFICATION_KINDS.overdue,
        title: `Overdue: ${assessment.title}`,
        body: `${assessment.regulation} assessment for ${assessment.department} was due on ${formatDay(
          assessment.dueDate
        )} (${describeDeadline(daysUntil(assessment.dueDate, today))}).`,
        link,
      });
    } else if (isDueSoon(assessment, today, windowDays)) {
      candidates.push({
        userId: assessment.assigneeId,
        kind: NOTIFICATION_KINDS.dueSoon,
        title: `Due soon: ${assessment.title}`,
        body: `${assessment.regulation} assessment for ${assessment.department} is due on ${formatDay(
          assessment.dueDate
        )} (${describeDeadline(daysUntil(assessment.dueDate, today))}).`,
        link,
      });
    }

    const { reviewDueDate } = assessment;
    if (reviewDueDate && isReReviewDue(assessment, today)) {
      candidates.push({
        userId: assessment.assigneeId,
        kind: NOTIFICATION_KINDS.reReviewDue,
        title: `Re-review due: ${assessment.title}`,
        body: `Closed ${assessment.regulation} assessment (cycle ${
          assessment.reviewCycle
        }) has been due for re-review since ${formatDay(reviewDueDate)}. Start a new cycle to refresh the answers.`,
        link,
      });
    }
  }

  if (candidates.length === 0) {
    return { today, scanned: assessments.length, created: 0, skipped: 0 };
  }

  const userIds = [...new Set(candidates.map((c) => c.userId))];

  const existing = await prisma.notification.findMany({
    where: {
      userId: { in: userIds },
      kind: { in: [...ALL_NOTIFICATION_KINDS] },
      read: false,
    },
    select: { userId: true, kind: true, link: true },
  });

  const seen = new Set(existing.map((n) => `${n.userId}|${n.kind}|${n.link ?? ""}`));
  const pending = candidates.filter((candidate) => {
    const key = `${candidate.userId}|${candidate.kind}|${candidate.link}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (pending.length > 0) {
    await prisma.notification.createMany({ data: pending });
  }

  return {
    today,
    scanned: assessments.length,
    created: pending.length,
    skipped: candidates.length - pending.length,
  };
}
