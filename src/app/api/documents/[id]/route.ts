import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { assessmentTemplates } from "@/data/templates";
import { regulations } from "@/data/organization";
import { buildReportModel, generatePdf, generateDocx } from "@/lib/document-builder";
import type { AssessmentTemplate, Regulation, Assessment } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "pdf";

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      risks: true,
      assignee: { select: { name: true } },
    },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (assessment.status !== "approved" && assessment.status !== "closed") {
    return NextResponse.json(
      { error: "Document generation requires assessment to be approved or closed" },
      { status: 403 }
    );
  }

  const template = assessmentTemplates.find((t) => t.id === assessment.templateId) as AssessmentTemplate | undefined;
  const regulation = regulations.find((r) => r.key === assessment.regulation) as Regulation | undefined;

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const model = buildReportModel({
    assessment: assessment as unknown as Assessment & { risks?: import("@/lib/types").Risk[]; assignee?: { name?: string } },
    template,
    regulation,
  });

  try {
    await prisma.activityLog.create({
      data: {
        action: "Document generated",
        entity: assessment.title,
        entityType: "assessment",
        userId: session.user.id,
        details: `${format.toUpperCase()} document exported (${model.reference})`,
      },
    });
  } catch {
    // ignore logging failures
  }

  if (format === "docx") {
    const bytes = await generateDocx(model);
    const filename = `PIA-${assessment.regulation}-${assessment.id}.docx`;
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const bytes = await generatePdf(model);
  const filename = `PIA-${assessment.regulation}-${assessment.id}.pdf`;
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
