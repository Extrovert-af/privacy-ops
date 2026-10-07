import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";

type Guard = {
  session: Session | null;
  response: NextResponse | null;
};

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "Admin access required" }, { status: 403 });
}

export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "admin";
}

export async function requireSession(): Promise<Guard> {
  const session = await auth();
  if (!session) return { session, response: unauthorized() };
  return { session, response: null };
}

export async function requireAdmin(): Promise<Guard> {
  const session = await auth();
  if (!session) return { session, response: unauthorized() };
  if (!isAdmin(session)) return { session, response: forbidden() };
  return { session, response: null };
}

export async function requireRole(...roles: string[]): Promise<Guard> {
  const session = await auth();
  if (!session) return { session, response: unauthorized() };
  if (!roles.includes(session.user.role)) return { session, response: forbidden() };
  return { session, response: null };
}
