import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { serializeAssessment } from "../route";
import { notifyAssignee } from "@/lib/assignment";
import { computeReviewDueDate } from "@/lib/deadlines";
import {
  ValidationError,
  VALID_STATUSES,
  str,
  oneOf,
  int,
  isoDate,
  cuid,
  responses,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const include = {
  assignee: { select: { name: true } },
  _count: { select: { risks: true } },
} as const;

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({ where: { id }, include });

  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serializeAssessment(assessment));
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  const isReviewer =
    role === "admin" || role === "privacy_officer" || role === "reviewer";

  const data: Record<string, unknown> = {};

  try {
    const body = await request.json();

    if (body.title !== undefined)
      data.title = str(body.title, "Title", { required: true, max: 200 });
    if (body.stakeholder !== undefined)
      data.stakeholder = str(body.stakeholder, "Stakeholder", { fallback: "Unassigned" });
    if (body.department !== undefined)
      data.department = str(body.department, "Department", { fallback: "Unassigned" });
    if (body.dueDate !== undefined) data.dueDate = isoDate(body.dueDate, "Due date");
    if (body.assigneeId !== undefined) {
      const nextAssignee = cuid(body.assigneeId, "Assignee");

      if (nextAssignee !== existing.assigneeId) {
        // Reassignment hands responsibility to someone else, so it is limited
        // to admins, privacy officers, and whoever created the assessment.
        const mayReassign =
          role === "admin" ||
          role === "privacy_officer" ||
          existing.createdBy === session.user.id;

        if (!mayReassign) {
          return NextResponse.json(
            {
              error:
                "Only admins, privacy officers, or the assessment creator can reassign it",
            },
            { status: 403 }
          );
        }

        const assignee = await prisma.user.findUnique({
          where: { id: nextAssignee },
          select: { active: true },
        });

        if (!assignee) throw new ValidationError("That assignee does not exist");
        if (!assignee.active) {
          throw new ValidationError("That assignee's account is deactivated");
        }
      }

      data.assigneeId = nextAssignee;
    }
    if (body.risksIdentified !== undefined)
      data.risksIdentified = int(body.risksIdentified, "Risks identified", {
        min: 0,
        max: 10000,
      });
    if (body.risksTotal !== undefined)
      data.risksTotal = int(body.risksTotal, "Risk total", { min: 0, max: 10000 });
    if (body.notes !== undefined) data.notes = str(body.notes, "Notes", { max: 10000 });
    if (body.responses !== undefined) data.responses = responses(body.responses);

    if (body.status !== undefined) {
      const status = oneOf(body.status, "Status", VALID_STATUSES);

      if (status !== existing.status) {
        if (["approved", "closed", "rejected"].includes(status) && !isReviewer) {
          return NextResponse.json(
            { error: "Only reviewers, privacy officers, or admins can change approval status" },
            { status: 403 }
          );
        }
        data.status = status;
      }
    }

    if (body.workflowStage !== undefined) {
      const stage = int(body.workflowStage, "Workflow stage", { min: 0, max: 4 });

      if (stage > existing.workflowStage && !isReviewer) {
        return NextResponse.json(
          { error: "Only reviewers can advance the workflow stage" },
          { status: 403 }
        );
      }
      data.workflowStage = stage;
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const statusChanged = data.status !== undefined && data.status !== existing.status;

  // Closing an assessment starts the clock on the next re-review: processing
  // activities drift, so the answers have to be revisited periodically.
  if (data.status === "closed") {
    const closedAt = new Date();
    data.completedAt = closedAt;
    data.lastReviewedAt = closedAt;
    data.reviewCycle = existing.reviewCycle + 1;
    data.reviewDueDate = computeReviewDueDate(closedAt);
  }

  const assessment = await prisma.assessment.update({
    where: { id },
    data,
    include,
  });

  if (statusChanged) {
    const status = String(data.status);
    await prisma.activityLog.create({
      data: {
        action:
          status === "in_review"
            ? "Submitted for review"
            : status === "approved"
            ? "Approved"
            : status === "rejected"
            ? "Rejected"
            : status === "closed"
            ? "Closed"
            : "Status updated",
        entity: assessment.title,
        entityType: "assessment",
        userId: session.user.id,
        details:
          status === "in_review"
            ? "Moved to Risk Evaluation stage"
            : status === "approved"
            ? "Final approval granted"
            : status === "closed"
            ? `Cycle ${assessment.reviewCycle} closed, re-review due ${assessment.reviewDueDate}`
            : undefined,
      },
    });
  } else if (data.responses) {
    const parsed = JSON.parse(String(data.responses));
    await prisma.activityLog.create({
      data: {
        action: "Assessment updated",
        entity: assessment.title,
        entityType: "assessment",
        userId: session.user.id,
        details: `${parsed.length} responses saved`,
      },
    });
  }

  const assigneeChanged =
    data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId;

  if (assigneeChanged) {
    await prisma.activityLog.create({
      data: {
        action: "Assigned assessment",
        entity: assessment.title,
        entityType: "assessment",
        userId: session.user.id,
        details: `Assigned to ${assessment.assignee?.name ?? "another user"}`,
      },
    });

    // Reassigning to yourself is a change of record, not a request for action.
    if (assessment.assigneeId !== session.user.id) {
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
  }

  return NextResponse.json(serializeAssessment(assessment));
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "admin" && role !== "privacy_officer") {
    return NextResponse.json(
      { error: "Only privacy officers and admins can delete assessments" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({ where: { id } });

  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.risk.deleteMany({ where: { assessmentId: id } });
  await prisma.assessment.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      action: "Deleted assessment",
      entity: assessment.title,
      entityType: "assessment",
      userId: session.user.id,
      details: `${assessment.regulation} record removed`,
    },
  });

  return NextResponse.json({ ok: true });
}