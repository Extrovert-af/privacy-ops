import prisma from "@/lib/prisma";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 8;
const LOCKOUT_MINUTES = 15;

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function checkLoginAllowed(key: string): Promise<boolean> {
  try {
    const row = await prisma.loginAttempt.findUnique({ where: { key } });

    if (!row?.lockedUntil) return true;

    if (row.lockedUntil <= new Date()) {
      await prisma.loginAttempt
        .update({ where: { key }, data: { count: 0, lockedUntil: null } })
        .catch(() => undefined);
      return true;
    }

    return false;
  } catch {
    // Never lock users out because the tracking table is unavailable.
    return true;
  }
}

export async function recordLoginFailure(key: string): Promise<void> {
  try {
    const row = await prisma.loginAttempt.findUnique({ where: { key } });
    const nextCount = (row?.count ?? 0) + 1;
    const shouldLock = nextCount >= MAX_ATTEMPTS;

    await prisma.loginAttempt.upsert({
      where: { key },
      create: {
        key,
        count: shouldLock ? 0 : nextCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null,
      },
      update: {
        count: shouldLock ? 0 : { increment: 1 },
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : row?.lockedUntil && row.lockedUntil <= new Date()
            ? null
            : row?.lockedUntil,
      },
    });
  } catch {
    // Fail open: a logging problem must not block legitimate sign-in.
  }
}

export async function clearLoginFailures(key: string): Promise<void> {
  try {
    await prisma.loginAttempt.deleteMany({ where: { key } });
  } catch {
    // Non-critical cleanup.
  }
}

export { LOCKOUT_MINUTES, WINDOW_MINUTES };