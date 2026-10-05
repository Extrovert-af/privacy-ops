import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from "docx";
import type { Assessment, Risk } from "./types";
import type { AssessmentTemplate, Regulation } from "./types";

export interface ReportModel {
  reference: string;
  title: string;
  regulationName: string;
  assessmentId: string;
  regulation: string;
  department: string;
  stakeholder: string;
  assigneeName: string | null | undefined;
  status: string;
  dueDate: string | null;
  createdAt: string;
  reviewCycle?: number;
  lastReviewedAt?: string | null;
  reviewDueDate?: string | null;
  completedAt?: string | null;
  template: AssessmentTemplate;
  responses: Array<{ questionId: string; response: string | string[] | boolean }>;
  risks: Risk[];
  generationTimestamp: string;
}

function safeParseResponses(
  resp: string | Array<{ questionId: string; response: string | string[] | boolean }>
): Array<{ questionId: string; response: string | string[] | boolean }> {
  if (Array.isArray(resp)) return resp;
  try {
    const parsed = JSON.parse(resp) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Array<{ questionId: string; response: string | string[] | boolean }>;
    }
    return [];
  } catch {
    return [];
  }
}

function formatAnswer(answer: string | string[] | boolean | undefined | null): string {
  if (answer === undefined || answer === null) return "Not answered";
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  if (Array.isArray(answer)) {
    return answer.length > 0 ? answer.join(", ") : "Not answered";
  }
  if (typeof answer === "string") {
    return answer.trim().length > 0 ? answer : "Not answered";
  }
  return "Not answered";
}

export function buildReportModel(params: {
  assessment: Assessment & { risks?: Risk[]; assignee?: { name?: string } };
  template: AssessmentTemplate;
  regulation: Regulation | undefined;
}): ReportModel {
  const { assessment, template, regulation } = params;
  const responses = safeParseResponses(assessment.responses as string | Array<{ questionId: string; response: string | string[] | boolean }>);

  const assigneeName = assessment.assignee?.name ?? assessment.assigneeName ?? "Unassigned";
  const generationTimestamp = new Date().toISOString();
  const refParts = [assessment.regulation, assessment.id].join("-");
  const reference = `PIA-${refParts}`;

  return {
    reference,
    title: assessment.title,
    regulationName: regulation?.name ?? assessment.regulation,
    assessmentId: assessment.id,
    regulation: assessment.regulation,
    department: assessment.department,
    stakeholder: assessment.stakeholder,
    assigneeName,
    status: assessment.status,
    dueDate: assessment.dueDate || null,
    createdAt: assessment.createdAt,
    template,
    responses,
    risks: assessment.risks ?? [],
    generationTimestamp,
    reviewCycle: assessment.reviewCycle ?? 1,
  };
}

function addWrappedText(page: import("pdf-lib").PDFPage, font: PDFFont, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const lines: string[] = [];
  const words = text.split(/\s+/);
  let current = "";
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const test = current ? current + " " + word : word;
    const width = font.widthOfTextAtSize(test, 10);
    if (width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  let curY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: curY, size: 10, font, color: rgb(0, 0, 0) });
    curY -= lineHeight;
  }
  return curY;
}

export async function generatePdf(model: ReportModel): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  let y = page.getHeight() - margin;

  page.drawText(model.title, { x: margin, y, size: 16, font: boldFont });
  y -= 22;
  page.drawText(`${model.regulationName}`, { x: margin, y, size: 12, font });
  y -= 16;
  page.drawText(`Document Reference: ${model.reference}`, { x: margin, y, size: 10, font: boldFont });
  y -= 14;
  page.drawText(`Generated: ${new Date(model.generationTimestamp).toLocaleString()}`, { x: margin, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 24;

  page.drawText("Metadata", { x: margin, y, size: 12, font: boldFont });
  y -= 16;

  // metadata prepared for rendering
  const metaLines = [
    `Assessment ID: ${model.assessmentId}`,
    `Regulation: ${model.regulation}`,
    `Department: ${model.department}`,
    `Stakeholder: ${model.stakeholder}`,
    `Assignee/Owner: ${model.assigneeName || "Unassigned"}`,
    `Status: ${model.status}`,
    `Due Date: ${model.dueDate ? new Date(model.dueDate).toLocaleDateString() : "N/A"}`,
    `Created Date: ${new Date(model.createdAt).toLocaleDateString()}`,
    `Review Cycle: ${model.reviewCycle ?? "N/A"}`,
  ];
  for (const line of metaLines) {
    if (y < margin + 40) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
    }
    page.drawText(line, { x: margin, y, size: 10, font });
    y -= 14;
  }
  y -= 10;

  for (const section of model.template.sections) {
    if (y < margin + 120) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
    }
    page.drawText(section.title, { x: margin, y, size: 12, font: boldFont });
    y -= 14;
    if (section.description) {
      y = addWrappedText(page, font, section.description, margin, y, page.getWidth() - margin * 2, 12);
      y -= 6;
    }
    for (const q of section.questions) {
      if (y < margin + 80) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getHeight() - margin;
      }
      const questionText = `${q.text}${q.required ? " (Required)" : ""}`;
      y = addWrappedText(page, boldFont, questionText, margin, y, page.getWidth() - margin * 2, 12);
      y -= 2;
      const answer = model.responses.find((r) => r.questionId === q.id)?.response;
      const answerText = formatAnswer(answer);
      y = addWrappedText(page, font, `Answer: ${answerText}`, margin + 10, y, page.getWidth() - margin * 2 - 10, 12);
      y -= 12;
    }
    y -= 16;
  }

  if (y < margin + 120) {
    page = pdfDoc.addPage([595.28, 841.89]);
    y = page.getHeight() - margin;
  }
  page.drawText("Risk Register", { x: margin, y, size: 12, font: boldFont });
  y -= 16;
  if (model.risks.length === 0) {
    page.drawText("No risks identified.", { x: margin, y, size: 10, font });
    y -= 14;
  } else {
    for (const risk of model.risks) {
      if (y < margin + 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getHeight() - margin;
      }
      page.drawText(risk.title, { x: margin, y, size: 11, font: boldFont });
      y -= 12;
      const score = risk.likelihood * risk.impact;
      const lines = [
        `Likelihood: ${risk.likelihood} | Impact: ${risk.impact} | Score: ${score}`,
        `Status: ${risk.status}`,
        `Mitigation: ${risk.mitigation}`,
        `Description: ${risk.description}`,
      ];
      for (const line of lines) {
        y = addWrappedText(page, font, line, margin + 10, y, page.getWidth() - margin * 2 - 10, 12);
        y -= 2;
      }
      y -= 12;
    }
  }

  page = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  page.drawText(`Footer: ${model.reference} | Generated ${new Date(model.generationTimestamp).toLocaleString()}`, {
    x: margin,
    y: margin - 10,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const bytes = await pdfDoc.save();
  return bytes;
}

export async function generateDocx(model: ReportModel): Promise<Uint8Array> {
  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      text: model.title,
    })
  );
  sections.push(
    new Paragraph({
      text: model.regulationName,
      spacing: { after: 200 },
    })
  );
  sections.push(
    new Paragraph({
      text: `Document Reference: ${model.reference}`,
      spacing: { after: 100 },
    })
  );
  sections.push(
    new Paragraph({
      text: `Generated: ${new Date(model.generationTimestamp).toLocaleString()}`,
      spacing: { after: 400 },
    })
  );

  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      text: "Metadata",
    })
  );

  const metaRows = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph("Assessment ID")] }),
        new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, children: [new Paragraph(model.assessmentId)] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Regulation")] }),
        new TableCell({ children: [new Paragraph(model.regulation)] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Department")] }),
        new TableCell({ children: [new Paragraph(model.department)] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Stakeholder")] }),
        new TableCell({ children: [new Paragraph(model.stakeholder)] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Assignee/Owner")] }),
        new TableCell({ children: [new Paragraph(model.assigneeName || "Unassigned")] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Status")] }),
        new TableCell({ children: [new Paragraph(model.status)] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Due Date")] }),
        new TableCell({ children: [new Paragraph(model.dueDate ? new Date(model.dueDate).toLocaleDateString() : "N/A")] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Created Date")] }),
        new TableCell({ children: [new Paragraph(new Date(model.createdAt).toLocaleDateString())] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Review Cycle")] }),
        new TableCell({ children: [new Paragraph(String(model.reviewCycle ?? "N/A"))] }),
      ],
    }),
  ];

  sections.push(
    new Paragraph({
      children: [
        new Table({
          rows: metaRows,
        }),
      ],
      spacing: { before: 100, after: 400 },
    })
  );

  for (const section of model.template.sections) {
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: section.title,
        spacing: { before: 400 },
      })
    );
    if (section.description) {
      sections.push(
        new Paragraph({
          text: section.description,
          spacing: { after: 200 },
        })
      );
    }
    for (const q of section.questions) {
      sections.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          text: `${q.text}${q.required ? " (Required)" : ""}`,
          spacing: { before: 200 },
        })
      );
      const answer = model.responses.find((r) => r.questionId === q.id)?.response;
      const answerText = formatAnswer(answer);
      sections.push(
        new Paragraph({
          text: `Answer: ${answerText}`,
          spacing: { after: 200 },
        })
      );
    }
  }

  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      text: "Risk Register",
      spacing: { before: 400 },
    })
  );
  if (model.risks.length === 0) {
    sections.push(new Paragraph({ text: "No risks identified." }));
  } else {
    for (const risk of model.risks) {
      const score = risk.likelihood * risk.impact;
      sections.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          text: risk.title,
        })
      );
      sections.push(
        new Paragraph({ text: `Likelihood: ${risk.likelihood} | Impact: ${risk.impact} | Score: ${score}` })
      );
      sections.push(new Paragraph({ text: `Status: ${risk.status}` }));
      sections.push(new Paragraph({ text: `Mitigation: ${risk.mitigation}` }));
      sections.push(new Paragraph({ text: `Description: ${risk.description}`, spacing: { after: 200 } }));
    }
  }

  sections.push(
    new Paragraph({
      text: `Footer: ${model.reference} | Generated ${new Date(model.generationTimestamp).toLocaleString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    })
  );

  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
