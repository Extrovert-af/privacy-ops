import type {
  Assessment,
  AssessmentQuestionResponse,
  Risk,
  User,
  ActivityLog,
  AppNotification,
  ComplianceMetrics,
  DeadlineRunResult,
  RegulationKey,
} from "./types";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new ApiError(body.error || `Request failed (${res.status})`, res.status);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  getAssessments: () => request<Assessment[]>("/api/assessments"),

  getAssessment: (id: string) => request<Assessment>(`/api/assessments/${id}`),

  createAssessment: (input: {
    title: string;
    templateId: string;
    regulation: string;
    stakeholder: string;
    department: string;
    dueDate: string;
    risksTotal: number;
  }) =>
    request<Assessment>("/api/assessments", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateAssessment: (
    id: string,
    updates: Partial<Assessment> & { responses?: AssessmentQuestionResponse[] }
  ) =>
    request<Assessment>(`/api/assessments/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

deleteAssessment: (id: string) => request<void>(`/api/assessments/${id}`, { method: "DELETE" }),

  startReReview: (id: string) =>
    request<Assessment>(`/api/assessments/${id}/re-review`, { method: "POST" }),

  getCompliance: (regulation?: RegulationKey | "all") =>
    request<ComplianceMetrics>(
      regulation && regulation !== "all" ? `/api/compliance?regulation=${encodeURIComponent(regulation)}` : "/api/compliance"
    ),

  getNotifications: (unreadOnly = false) =>
    request<AppNotification[]>(`/api/notifications${unreadOnly ? "?unread=true" : ""}`),

  markNotificationRead: (id: string) =>
    request<AppNotification>(`/api/notifications/${id}`, { method: "POST" }),

  createNotification: (input: {
    userId?: string;
    title: string;
    body: string;
    kind: string;
    link?: string | null;
  }) =>
    request<AppNotification>("/api/notifications", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  runDeadlineNotifications: () =>
    request<DeadlineRunResult>("/api/notifications/generate", { method: "POST" }),


  getRisks: () => request<Risk[]>("/api/risks"),

  createRisk: (input: {
    title: string;
    description: string;
    likelihood: number;
    impact: number;
    mitigation: string;
    ownerId: string;
    status: Risk["status"];
    assessmentId?: string | null;
  }) =>
    request<Risk>("/api/risks", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateRisk: (id: string, updates: Partial<Risk>) =>
    request<Risk>(`/api/risks/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteRisk: (id: string) => request<void>(`/api/risks/${id}`, { method: "DELETE" }),

  getUsers: () => request<User[]>("/api/users"),

  createUser: (input: {
    name: string;
    email: string;
    role: string;
    department: string;
    password?: string;
  }) =>
    request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateUser: (id: string, updates: Partial<User>) =>
    request<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  changePassword: (id: string, currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>(`/api/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getActivities: () => request<ActivityLog[]>("/api/activities"),
};

/// Dates are stored as "YYYY-MM-DD" strings. `new Date("2026-08-01")` parses
/// that as UTC midnight, which renders as the previous day anywhere west of
/// UTC (e.g. Jul 31 in New York). Build the date in local time instead so a
/// stored date always displays as itself.
export function formatDate(dateStr: string): string {
  const plainDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);

  const date = plainDay
    ? new Date(Number(plainDay[1]), Number(plainDay[2]) - 1, Number(plainDay[3]))
    : new Date(dateStr);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}