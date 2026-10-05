import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeRisk } from "../route";
import {
  ValidationError,
  VALID_RISK_STATUSES,
  str,
  oneOf,
  int,
  cuid,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const include = {
  owner: { select: { name: true } },
  assessment: { select: { title: true, regulation: true } },
} as const;

async function syncAssessmentRiskCount(assessmentId: string | null) {
  if (!assessmentId) return;
  const count = await prisma.risk.count({ where: { assessmentId } });
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { risksIdentified: count },
  });
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.risk.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  if (role === "viewer") {
    return NextResponse.json(
      { error: "Viewers cannot modify risks" },
      { status: 403 }
    );
  }

  const data: Record<string, unknown> = {};

  try {
    const body = await request.json();

    if (body.title !== undefined)
      data.title = str(body.title, "Title", { required: true, max: 200 });
    if (body.description !== undefined)
      data.description = str(body.description, "Description", { max: 5000 });
    if (body.mitigation !== undefined)
      data.mitigation = str(body.mitigation, "Mitigation", { max: 5000 });
    if (body.likelihood !== undefined)
      data.likelihood = int(body.likelihood, "Likelihood", { min: 1, max: 5 });
    if (body.impact !== undefined)
      data.impact = int(body.impact, "Impact", { min: 1, max: 5 });
    if (body.status !== undefined)
      data.status = oneOf(body.status, "Status", VALID_RISK_STATUSES);

    if (body.ownerId !== undefined) {
      const ownerId = cuid(body.ownerId, "Owner");
      const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
      if (!owner) throw new ValidationError("Selected owner does not exist");
      data.ownerId = ownerId;
    }

    if (body.assessmentId !== undefined) {
      if (!body.assessmentId) {
        data.assessmentId = null;
      } else {
        const assessmentId = cuid(body.assessmentId, "Assessment");
        const linked = await prisma.assessment.findUnique({
          where: { id: assessmentId },
          select: { id: true },
        });
        if (!linked) throw new ValidationError("Selected assessment does not exist");
        data.assessmentId = assessmentId;
      }
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const risk = await prisma.risk.update({ where: { id }, data, include });

  if (body.assessmentId !== undefined) {
    await syncAssessmentRiskCount(existing.assessmentId);
    await syncAssessmentRiskCount(risk.assessmentId);
  }

  if (body.status === "resolved" && existing.status !== "resolved") {
    await prisma.activityLog.create({
      data: {
        action: "Risk resolved",
        entity: risk.title,
        entityType: "risk",
        userId: session.user.id,
        details: "Mitigation complete",
      },
    });
  }

  return NextResponse.json(serializeRisk(risk));
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role === "viewer" || role === "assessor") {
    return NextResponse.json(
      { error: "Only reviewers, privacy officers, or admins can delete risks" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const risk = await prisma.risk.findUnique({ where: { id } });
  if (!risk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.risk.delete({ where: { id } });
  await syncAssessmentRiskCount(risk.assessmentId);

  await prisma.activityLog.create({
    data: {
      action: "Deleted risk",
      entity: risk.title,
      entityType: "risk",
      userId: session.user.id,
      details: "Risk record removed",
    },
  });

  return NextResponse.json({ ok: true });
}