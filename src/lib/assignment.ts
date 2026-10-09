import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NOTIFICATION_KINDS } from "@/lib/notifications";
import { formatDay } from "@/lib/deadlines";

/** Base URL for links in outbound email. */
function siteUrl(): string {
  const raw =
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  return raw.replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type AssignNotifyResult = {
  notified: boolean;
  emailed: boolean;
  emailSkippedReason?: string;
};

/**
 * Tells someone an assessment is now theirs: an in-app notification always,
 * plus an email when delivery is configured.
 *
 * Never throws. An assignment that already succeeded must not be undone by a
 * mail outage, so a failed send is reported rather than raised.
 */
export async function notifyAssignee(params: {
  assessmentId: string;
  assessmentTitle: string;
  regulation: string;
  department: string;
  dueDate: string;
  assigneeId: string;
  actorName: string;
}): Promise<AssignNotifyResult> {
  const assignee = await prisma.user.findUnique({
    where: { id: params.assigneeId },
    select: { name: true, email: true },
  });

  if (!assignee) {
    return { notified: false, emailed: false, emailSkippedReason: "Assignee not found" };
  }

  const link = `/assessments/${params.assessmentId}`;
  const due = params.dueDate ? formatDay(params.dueDate) : "no due date set";

  await prisma.notification.create({
    data: {
      userId: params.assigneeId,
      kind: NOTIFICATION_KINDS.assigned,
      title: `Assigned: ${params.assessmentTitle}`,
      body: `${params.actorName} assigned you this ${params.regulation} assessment. Due ${due}.`,
      link,
    },
  });

  const url = `${siteUrl()}${link}`;
  const subject = `You've been assigned: ${params.assessmentTitle}`;

  const text = [
    `Hi ${assignee.name},`,
    "",
    `${params.actorName} assigned you a ${params.regulation} assessment in PrivacyOps.`,
    "",
    `Assessment: ${params.assessmentTitle}`,
    `Department: ${params.department}`,
    `Due: ${due}`,
    "",
    `Open it here: ${url}`,
    "",
    "Sign in with your PrivacyOps account and the assessment will open.",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <p>Hi ${escapeHtml(assignee.name)},</p>
      <p>
        <strong>${escapeHtml(params.actorName)}</strong> assigned you a
        ${escapeHtml(params.regulation)} assessment in PrivacyOps.
      </p>
      <table style="margin: 20px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #64748b;">Assessment</td>
          <td style="padding: 4px 0; font-weight: 600;">${escapeHtml(params.assessmentTitle)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #64748b;">Department</td>
          <td style="padding: 4px 0;">${escapeHtml(params.department)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 12px 4px 0; color: #64748b;">Due</td>
          <td style="padding: 4px 0;">${escapeHtml(due)}</td>
        </tr>
      </table>
      <p style="margin: 28px 0;">
        <a href="${url}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; display: inline-block;">
          Open Assessment
        </a>
      </p>
      <p style="color: #64748b; font-size: 14px;">
        Sign in with your PrivacyOps account and the assessment will open automatically.
      </p>
    </div>
  `;

  const sent = await sendEmail({ to: assignee.email, subject, html, text });

  if (!sent.ok) {
    console.warn(`Assignment email to ${assignee.email} not sent: ${sent.reason}`);
    return { notified: true, emailed: false, emailSkippedReason: sent.reason };
  }

  return { notified: true, emailed: true };
}
