import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { notifyAssignee } from "@/lib/assignment";
import {
  ValidationError,
  VALID_REGULATIONS,
  str,
  oneOf,
  int,
  isoDate,
  cuid,
} from "@/lib/validation";

export type ApiAssessment = {
  id: string;
  title: string;
  templateId: string;
  regulation: string;
  status: string;
  stakeholder: string;
  department: string;
  dueDate: string;
  workflowStage: number;
  risksIdentified: number;
  risksTotal: number;
  notes: string;
  responses: Array<{ questionId: string; response: string | string[] | boolean }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assigneeId: string;
  assigneeName: string;
  riskCount: number;
  reviewCycle: number;
  lastReviewedAt: string | null;
  reviewDueDate: string | null;
  completedAt: string | null;
};

export function serializeAssessment(a: {
  id: string;
  title: string;
  templateId: string;
  regulation: string;
  status: string;
  stakeholder: string;
  department: string;
  dueDate: string;
  workflowStage: number;
  risksIdentified: number;
  risksTotal: number;
  notes: string | null;
  responses: string;
  createdAt: Date;
  updatedAt: Date;
  reviewCycle: number;
  lastReviewedAt: Date | null;
  reviewDueDate: string | null;
  completedAt: Date | null;
  createdBy: string;
  assigneeId: string;
  assignee?: { name: string } | null;
  _count?: { risks: number };
}): ApiAssessment {
  return {
    id: a.id,
    title: a.title,
    templateId: a.templateId,
    regulation: a.regulation,
    status: a.status,
    stakeholder: a.stakeholder,
    department: a.department,
    dueDate: a.dueDate,
    workflowStage: a.workflowStage,
    risksIdentified: a.risksIdentified,
    risksTotal: a.risksTotal,
    notes: a.notes ?? "",
    responses: JSON.parse(a.responses),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    createdBy: a.createdBy,
    assigneeId: a.assigneeId,
    assigneeName: a.assignee?.name ?? "Unassigned",
    riskCount: a._count?.risks ?? 0,
    reviewCycle: a.reviewCycle,
    lastReviewedAt: a.lastReviewedAt?.toISOString() ?? null,
    reviewDueDate: a.reviewDueDate,
    completedAt: a.completedAt?.toISOString() ?? null,
  };
}

const include = {
  assignee: { select: { name: true } },
  _count: { select: { risks: true } },
} as const;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assessments = await prisma.assessment.findMany({
    orderBy: { updatedAt: "desc" },
    include,
  });

  return NextResponse.json(assessments.map(serializeAssessment));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let assessment;

  try {
    const body = await request.json();

    const data = {
      title: str(body.title, "Title", { required: true, max: 200 }),
      templateId: str(body.templateId, "Template", { required: true, max: 100 }),
      regulation: oneOf(body.regulation, "Regulation", VALID_REGULATIONS),
      stakeholder: str(body.stakeholder, "Stakeholder", { fallback: "Unassigned" }),
      department: str(body.department, "Department", { fallback: "Unassigned" }),
      dueDate: isoDate(body.dueDate, "Due date"),
      risksTotal: int(body.risksTotal, "Risk total", { min: 0, max: 10000 }),
    };

    // The creator picks who owns the work; leaving it blank self-assigns.
    const assigneeId =
      body.assigneeId === undefined || body.assigneeId === null || body.assigneeId === ""
        ? session.user.id
        : cuid(body.assigneeId, "Assignee");

    if (assigneeId !== session.user.id) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { active: true },
      });

      if (!assignee) throw new ValidationError("That assignee does not exist");
      if (!assignee.active) {
        throw new ValidationError("That assignee's account is deactivated");
      }
    }

    assessment = await prisma.assessment.create({
      data: {
        ...data,
        status: "draft",
        createdBy: session.user.id,
        assigneeId,
        risksIdentified: 0,
        workflowStage: 1,
        notes: "",
        responses: "[]",
      },
      include,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  await prisma.activityLog.create({
    data: {
      action: "Created assessment",
      entity: assessment.title,
      entityType: "assessment",
      userId: session.user.id,
      details: `${assessment.regulation} template`,
    },
  });

  // Someone else's work needs flagging; self-assignment does not.
  if (assessment.assigneeId !== session.user.id) {
    await prisma.activityLog.create({
      data: {
        action: "Assigned assessment",
        entity: assessment.title,
        entityType: "assessment",
        userId: session.user.id,
        details: `Assigned to ${assessment.assignee?.name ?? "another user"}`,
      },
    });

    await notifyAssignee({
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      regulation: assessment.regulation,
      department: assessment.department,
      dueDate: assessment.dueDate,
      assigneeId: assessment.assigneeId,
      actorName: session.user.name ?? "A team member",
    });
  }

  return NextResponse.json(serializeAssessment(assessment), { status: 201 });
}