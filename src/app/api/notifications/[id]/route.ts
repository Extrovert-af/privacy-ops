import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeNotification } from "../route";

type Params = { params: Promise<{ id: string }> };

const include = {
  user: { select: { name: true } },
} as const;

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.notification.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json(
      { error: "This notification belongs to another user" },
      { status: 403 }
    );
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: { read: true },
    include,
  });

  return NextResponse.json(serializeNotification(notification));
}
