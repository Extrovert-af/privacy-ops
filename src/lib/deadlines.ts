/**
 * Pure due-date helpers shared by the compliance API, the dashboard and the
 * deadline notification job. No database access and no framework imports, so
 * this module is safe to use from both server routes and client components.
 *
 * Day-level deadlines (`Assessment.dueDate`, `Assessment.reviewDueDate`) are
 * stored as `YYYY-MM-DD` strings. All comparisons therefore work on the
 * calendar-day level: `new Date("2026-01-01")` parses as UTC midnight and
 * renders as 31 Dec in negative UTC offsets, so it is never used for
 * day arithmetic here.
 */

export const DUE_SOON_WINDOW_DAYS = 14;

/// Statuses that need no further chasing: the work is finished or signed off.
export const DONE_STATUSES = ["approved", "closed"] as const;

export type DueBucket = "overdue" | "due_soon" | "on_track" | "done";

/// Minimal shape needed for the deadline helpers, so plain Prisma rows,
/// serialized API rows and hand-written tests all satisfy it.
export type DeadlineRecord = {
  dueDate: string;
  status: string;
};

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/// True only for real calendar days, so "2026-02-30" is rejected up front
/// rather than silently rolling over into March.
export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);

  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month - 1);
}

/// Days since the Unix epoch for a `YYYY-MM-DD` string, or null when the input
/// is not a valid calendar day.
export function toEpochDay(dateStr: string): number | null {
  if (!isDateString(dateStr)) return null;

  const [year, month, day] = dateStr.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/// Today's date in the server/browser's own timezone, as `YYYY-MM-DD`.
/// UTC would report the previous day for anyone east of Greenwich in the
/// evening, and the next one for anyone in the Americas.
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/// Whole days from `today` until `dateStr`. Negative means the date has passed,
/// 0 means due today. Null when either input is not a valid calendar day.
export function daysUntil(dateStr: string, today: string): number | null {
  const target = toEpochDay(dateStr);
  const base = toEpochDay(today);

  if (target === null || base === null) return null;
  return target - base;
}

export function isDone(record: { status: string }): boolean {
  return (DONE_STATUSES as readonly string[]).includes(record.status);
}

/// Past its due date and not yet approved or closed.
export function isOverdue(assessment: DeadlineRecord, today: string): boolean {
  if (isDone(assessment)) return false;

  const days = daysUntil(assessment.dueDate, today);
  return days !== null && days < 0;
}

/// Due within `windowDays` (inclusive) and still outstanding.
export function isDueSoon(
  assessment: DeadlineRecord,
  today: string,
  windowDays: number = DUE_SOON_WINDOW_DAYS
): boolean {
  if (isDone(assessment)) return false;

  const days = daysUntil(assessment.dueDate, today);
  return days !== null && days >= 0 && days <= windowDays;
}

/// Which deadline list an assessment belongs in. Assessments without a usable
/// due date are "on_track" — there is nothing to chase.
export function dueBucket(
  assessment: DeadlineRecord,
  today: string,
  windowDays: number = DUE_SOON_WINDOW_DAYS
): DueBucket {
  if (isDone(assessment)) return "done";

  const days = daysUntil(assessment.dueDate, today);
  if (days === null) return "on_track";
  if (days < 0) return "overdue";
  if (days <= windowDays) return "due_soon";
  return "on_track";
}

/// Re-review date for a freshly closed assessment, as `YYYY-MM-DD`.
///
/// The month is added on the calendar, then the day is clamped to the last day
/// of the target month, so closing on 31 Jan with the default 12 months lands
/// on 31 Jan rather than rolling into early March.
export function computeReviewDueDate(closedAt: Date, monthsLater = 12): string {
  const months = Number.isFinite(monthsLater) ? Math.trunc(monthsLater) : 12;
  const startMonth = closedAt.getMonth();
  const targetMonthIndex = startMonth + months;
  const targetYear = closedAt.getFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const day = Math.min(closedAt.getDate(), daysInMonth(targetYear, targetMonth));

  return `${targetYear}-${pad(targetMonth + 1)}-${pad(day)}`;
}

/// A closed assessment is due for re-review once its review date has passed.
export function isReReviewDue(
  assessment: { status: string; reviewDueDate: string | null },
  today: string
): boolean {
  if (assessment.status !== "closed") return false;

  const days = daysUntil(assessment.reviewDueDate ?? "", today);
  return days !== null && days < 0;
}

/// "3 days overdue" / "due today" / "due in 6 days", for UI copy.
export function describeDeadline(days: number | null): string {
  if (days === null) return "No due date";
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return "1 day overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/// Formats a `YYYY-MM-DD` string for display without the UTC-midnight shift
/// that `new Date(str).toLocaleDateString()` introduces in western timezones.
export function formatDay(dateStr: string): string {
  if (!isDateString(dateStr)) return "Not set";

  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
