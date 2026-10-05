import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
  ValidationError,
  VALID_RISK_STATUSES,
  str,
  oneOf,
  int,
  cuid,
} from "@/lib/validation";

export type ApiRisk = {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  mitigation: string;
  status: string;
  assessmentId: string | null;
  assessmentTitle: string | null;
  assessmentRegulation: string | null;
  ownerId: string;
  ownerName: string;
  createdAt: string;
};

const include = {
  owner: { select: { name: true } },
  assessment: { select: { title: true, regulation: true } },
} as const;

export function serializeRisk(r: {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  mitigation: string;
  status: string;
  assessmentId: string | null;
  ownerId: string;
  createdAt: Date;
  owner?: { name: string } | null;
  assessment?: { title: string; regulation: string } | null;
}): ApiRisk {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    likelihood: r.likelihood,
    impact: r.impact,
    mitigation: r.mitigation,
    status: r.status,
    assessmentId: r.assessmentId,
    assessmentTitle: r.assessment?.title ?? null,
    assessmentRegulation: r.assessment?.regulation ?? null,
    ownerId: r.ownerId,
    ownerName: r.owner?.name ?? "Unassigned",
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const risks = await prisma.risk.findMany({
    orderBy: { createdAt: "desc" },
    include,
  });

  return NextResponse.json(risks.map(serializeRisk));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot create risks" }, { status: 403 });
  }

  let risk;

  try {
    const body = await request.json();

    const ownerId = body.ownerId ? cuid(body.ownerId, "Owner") : session.user.id;
    const assignee = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });
    if (!assignee) throw new ValidationError("Selected owner does not exist");

    let assessmentId: string | null = null;
    if (body.assessmentId) {
      assessmentId = cuid(body.assessmentId, "Assessment");
      const linked = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: { id: true },
      });
      if (!linked) throw new ValidationError("Selected assessment does not exist");
    }

    risk = await prisma.risk.create({
      data: {
        title: str(body.title, "Title", { required: true, max: 200 }),
        description: str(body.description, "Description", { max: 5000 }),
        likelihood: int(body.likelihood, "Likelihood", { min: 1, max: 5, fallback: 3 }),
        impact: int(body.impact, "Impact", { min: 1, max: 5, fallback: 3 }),
        mitigation: str(body.mitigation, "Mitigation", { max: 5000 }),
        status: oneOf(body.status, "Status", VALID_RISK_STATUSES, "open"),
        ownerId,
        assessmentId,
      },
      include,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  if (risk.assessmentId) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: risk.assessmentId },
    });
    if (assessment) {
      const count = await prisma.risk.count({ where: { assessmentId: risk.assessmentId } });
      await prisma.assessment.update({
        where: { id: risk.assessmentId },
        data: { risksIdentified: count, risksTotal: Math.max(assessment.risksTotal, count) },
      });
    }
  }

  await prisma.activityLog.create({
    data: {
      action: "Risk identified",
      entity: risk.title,
      entityType: "risk",
      userId: session.user.id,
      details: `Score ${risk.likelihood * risk.impact}/25`,
    },
  });

  return NextResponse.json(serializeRisk(risk), { status: 201 });
}