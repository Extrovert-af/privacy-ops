import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeAssessment } from "../../route";

type Params = { params: Promise<{ id: string }> };

const include = {
  assignee: { select: { name: true } },
  _count: { select: { risks: true } },
} as const;

/// Re-opens a closed assessment as a fresh review cycle: the answers go back to
/// a draft, the workflow restarts at the initial assessment stage, and the
/// pending re-review date is cleared. The cycle counter is bumped so the
/// report can show how many times the assessment has been through review.
export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "admin" && role !== "privacy_officer" && role !== "reviewer") {
    return NextResponse.json(
      { error: "Only reviewers, privacy officers, or admins can start a re-review cycle" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "closed") {
    return NextResponse.json(
      { error: "Only closed assessments can start a re-review cycle" },
      { status: 409 }
    );
  }

  const assessment = await prisma.assessment.update({
    where: { id },
    data: {
      status: "draft",
      workflowStage: 1,
      reviewCycle: existing.reviewCycle + 1,
      reviewDueDate: null,
      completedAt: null,
    },
    include,
  });

  await prisma.activityLog.create({
    data: {
      action: "Re-review started",
      entity: assessment.title,
      entityType: "assessment",
      userId: session.user.id,
      details: `Cycle ${assessment.reviewCycle} reopened as draft`,
    },
  });

  return NextResponse.json(serializeAssessment(assessment));
}
