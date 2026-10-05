import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activities = await prisma.activityLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  return NextResponse.json(
    activities.map((a) => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityType: a.entityType,
      userId: a.userId,
      userName: a.user.name,
      timestamp: a.timestamp.toISOString(),
      details: a.details ?? undefined,
    }))
  );
}