export const VALID_ROLES = ["viewer", "assessor", "reviewer", "privacy_officer", "admin"] as const;
export const VALID_STATUSES = ["draft", "in_review", "approved", "rejected", "closed"] as const;
export const VALID_REGULATIONS = ["GDPR", "CCPA", "HIPAA", "PIPEDA", "DPDPA", "PIPL"] as const;
export const VALID_RISK_STATUSES = ["open", "mitigating", "resolved", "accepted"] as const;

export const STAGE_LABELS: Record<number, string> = {
  0: "Not started",
  1: "Draft",
  2: "Submitted for review",
  3: "Under review",
  4: "Approved",
};

export class ValidationError extends Error {}

const LIMITS = {
  email: 254,
  password: 128,
  name: 120,
  shortText: 200,
  longText: 5000,
  notes: 10000,
  date: 10,
} as const;

export function str(
  value: unknown,
  field: string,
  opts: { required?: boolean; max?: number; fallback?: string } = {},
): string {
  const { required = false, max = LIMITS.shortText, fallback = "" } = opts;

  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${field} is required`);
    return fallback;
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be text`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    if (required) throw new ValidationError(`${field} is required`);
    return fallback;
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be ${max} characters or fewer`);
  }

  return trimmed;
}

export function email(value: unknown): string {
  const candidate = str(value, "Email", { required: true, max: LIMITS.email }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate)) {
    throw new ValidationError("Enter a valid email address");
  }

  return candidate;
}

export function password(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("Password must be text");
  }

  if (value.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }

  if (value.length > LIMITS.password) {
    throw new ValidationError(`Password must be ${LIMITS.password} characters or fewer`);
  }

  return value;
}

export function oneOf<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
  fallback?: T[number],
): T[number] {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    throw new ValidationError(`${field} is required`);
  }

  if (typeof value !== "string" || !allowed.includes(value as T[number])) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(", ")}`);
  }

  return value as T[number];
}

export function int(
  value: unknown,
  field: string,
  opts: { required?: boolean; min?: number; max?: number; fallback?: number } = {},
): number {
  const { required = false, min = 0, max = 100, fallback = 0 } = opts;

  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} is required`);
    return fallback;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new ValidationError(`${field} must be a whole number`);
  }

  if (parsed < min || parsed > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }

  return parsed;
}

export function isoDate(value: unknown, field: string, fallback = ""): string {
  const candidate = str(value, field, { max: LIMITS.date, fallback });

  if (!candidate) return fallback;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate) || Number.isNaN(Date.parse(candidate))) {
    throw new ValidationError(`${field} must be a valid date`);
  }

  return candidate;
}

export function responses(value: unknown): string {
  if (value === undefined || value === null) return "[]";

  const list = Array.isArray(value) ? value : null;
  if (!list) throw new ValidationError("Responses must be a list");

  if (list.length > 500) {
    throw new ValidationError("Too many responses");
  }

  const cleaned = list.map((entry) => {
    const item = entry as Record<string, unknown>;
    const response = item?.response;

    if (typeof response === "string") {
      return {
        questionId: str(item.questionId, "Question", { required: true, max: 100 }),
        response: str(response, "Response", { max: LIMITS.longText }),
      };
    }

    if (Array.isArray(response)) {
      return {
        questionId: str(item.questionId, "Question", { required: true, max: 100 }),
        response: response
          .slice(0, 100)
          .map((option) => str(option, "Option", { max: 200 })),
      };
    }

    if (typeof response === "boolean") {
      return {
        questionId: str(item.questionId, "Question", { required: true, max: 100 }),
        response,
      };
    }

    throw new ValidationError("Each response must be text, a list, or yes/no");
  });

  return JSON.stringify(cleaned);
}

export function cuid(value: unknown, field: string): string {
  const candidate = str(value, field, { required: true, max: 100 });

  if (!/^[a-z0-9]+$/i.test(candidate)) {
    throw new ValidationError(`Invalid ${field}`);
  }

  return candidate;
}