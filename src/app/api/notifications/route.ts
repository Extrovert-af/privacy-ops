import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { ValidationError, str, oneOf, cuid } from "@/lib/validation";
import { ALL_NOTIFICATION_KINDS } from "@/lib/notifications";
import type { AppNotification } from "@/lib/types";

export type ApiNotification = AppNotification;

const include = {
  user: { select: { name: true } },
} as const;

export function serializeNotification(n: {
  id: string;
  title: string;
  body: string;
  kind: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
  userId: string;
}): ApiNotification {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
    userId: n.userId,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unreadOnly = new URL(request.url).searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id, ...(unreadOnly ? { read: false } : {}) },
    // Unread first, then newest first.
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 50,
    include,
  });

  return NextResponse.json(notifications.map(serializeNotification));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let notification;

  try {
    const body = await request.json();

    const userId = body.userId ? cuid(body.userId, "User") : session.user.id;

    // Admins may notify anyone (the reminder job targets assignees); everyone
    // else may only notify themselves.
    if (userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create notifications for another user" },
        { status: 403 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) throw new ValidationError("Selected user does not exist");

    notification = await prisma.notification.create({
      data: {
        userId,
        title: str(body.title, "Title", { required: true, max: 200 }),
        body: str(body.body, "Body", { required: true, max: 2000 }),
        kind: oneOf(body.kind, "Kind", ALL_NOTIFICATION_KINDS),
        link: str(body.link, "Link", { max: 200 }) || null,
      },
      include,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json(serializeNotification(notification), { status: 201 });
}
