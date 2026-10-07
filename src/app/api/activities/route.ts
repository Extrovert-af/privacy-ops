import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

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