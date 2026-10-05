import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.activityLog.deleteMany();
  // Notifications reference users with ON DELETE RESTRICT, so they have to go
  // before the user rows.
  await prisma.notification.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create users
  const sarah = await prisma.user.create({
    data: {
      name: "Sarah Chen",
      email: "sarah@privacyops.com",
      password: hashedPassword,
      role: "admin",
      department: "Privacy Office",
      avatarColor: "#6366f1",
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: "Marcus Johnson",
      email: "marcus@privacyops.com",
      password: hashedPassword,
      role: "privacy_officer",
      department: "Legal & Compliance",
      avatarColor: "#8b5cf6",
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "priya@privacyops.com",
      password: hashedPassword,
      role: "reviewer",
      department: "Data Governance",
      avatarColor: "#059669",
    },
  });

  const tom = await prisma.user.create({
    data: {
      name: "Tom Wilson",
      email: "tom@privacyops.com",
      password: hashedPassword,
      role: "assessor",
      department: "Engineering",
      avatarColor: "#d97706",
    },
  });

  const emma = await prisma.user.create({
    data: {
      name: "Emma Rodriguez",
      email: "emma@privacyops.com",
      password: hashedPassword,
      role: "viewer",
      department: "Operations",
      avatarColor: "#dc2626",
    },
  });

  // Create assessments
  const assess1 = await prisma.assessment.create({
    data: {
      id: "assess-1",
      title: "Customer Marketing Analytics Platform",
      templateId: "tmpl-gdpr-dpia",
      regulation: "GDPR",
      status: "in_review",
      stakeholder: "Marketing",
      department: "Marketing",
      dueDate: "2026-09-15",
      workflowStage: 2,
      risksIdentified: 1,
      risksTotal: 3,
      notes: "Assessment in progress. Marketing analytics platform collects customer behavior data across multiple channels.",
      responses: "[]",
      createdBy: sarah.id,
      assigneeId: marcus.id,
    },
  });

  const assess2 = await prisma.assessment.create({
    data: {
      id: "assess-2",
      title: "Patient Health Records Portal",
      templateId: "tmpl-hipaa-pia",
      regulation: "HIPAA",
      status: "draft",
      stakeholder: "Operations",
      department: "Operations",
      dueDate: "2026-09-30",
      workflowStage: 1,
      risksIdentified: 0,
      risksTotal: 0,
      notes: "Initial draft for patient portal handling protected health information.",
      responses: "[]",
      createdBy: sarah.id,
      assigneeId: emma.id,
    },
  });

  await prisma.assessment.create({
    data: {
      id: "assess-3",
      title: "California Consumer Mobile App",
      templateId: "tmpl-ccpa-pia",
      regulation: "CCPA",
      status: "approved",
      stakeholder: "Engineering",
      department: "Engineering",
      dueDate: "2026-08-25",
      workflowStage: 4,
      risksIdentified: 2,
      risksTotal: 2,
      notes: "Completed assessment for CCPA compliance. All identified risks have been addressed.",
      responses: "[]",
      createdBy: sarah.id,
      assigneeId: tom.id,
    },
  });

  const assess4 = await prisma.assessment.create({
    data: {
      id: "assess-4",
      title: "Cross-Border Customer Database",
      templateId: "tmpl-pipl-pia",
      regulation: "PIPL",
      status: "in_review",
      stakeholder: "Sales",
      department: "Sales",
      dueDate: "2026-09-20",
      workflowStage: 3,
      risksIdentified: 1,
      risksTotal: 4,
      notes: "Cross-border data transfer assessment for customer database. PIPL compliance review in progress.",
      responses: "[]",
      createdBy: sarah.id,
      assigneeId: priya.id,
    },
  });

  const assess5 = await prisma.assessment.create({
    data: {
      id: "assess-5",
      title: "HR Employee Data Processing",
      templateId: "tmpl-pipeda-pia",
      regulation: "PIPEDA",
      status: "closed",
      stakeholder: "HR",
      department: "HR",
      dueDate: "2026-08-01",
      workflowStage: 4,
      risksIdentified: 3,
      risksTotal: 3,
      notes: "Assessment completed and closed. All recommendations implemented.",
      responses: "[]",
      createdBy: sarah.id,
      assigneeId: marcus.id,
    },
  });

  const assess6 = await prisma.assessment.create({
    data: {
      id: "assess-6",
      title: "Digital Onboarding Platform",
      templateId: "tmpl-dpdpa-pia",
      regulation: "DPDPA",
      status: "draft",
      stakeholder: "Product",
      department: "Product",
      dueDate: "2026-10-01",
      workflowStage: 1,
      risksIdentified: 0,
      risksTotal: 0,
      notes: "New assessment for digital onboarding platform under DPDPA requirements.",
      responses: "[]",
      createdBy: sarah.id,
      assigneeId: priya.id,
    },
  });

  // Create risks
  await prisma.risk.create({
    data: {
      id: "risk-1",
      title: "Unauthorized access to customer marketing data",
      description: "Risk of unauthorized personnel accessing sensitive customer marketing data without proper authorization.",
      likelihood: 3,
      impact: 4,
      mitigation: "Implement RBAC and least-privilege policies",
      status: "mitigating",
      ownerId: sarah.id,
      assessmentId: assess1.id,
    },
  });

  await prisma.risk.create({
    data: {
      id: "risk-2",
      title: "Cross-border data transfer non-compliance",
      description: "Risk of non-compliance with PIPL requirements for cross-border data transfers.",
      likelihood: 4,
      impact: 5,
      mitigation: "Execute Standard Contractual Clauses",
      status: "open",
      ownerId: marcus.id,
      assessmentId: assess4.id,
    },
  });

  await prisma.risk.create({
    data: {
      id: "risk-3",
      title: "Insufficient encryption for PHI at rest",
      description: "Protected health information may not be adequately encrypted at rest in the database.",
      likelihood: 2,
      impact: 5,
      mitigation: "Deploy enterprise encryption solution",
      status: "open",
      ownerId: tom.id,
      assessmentId: assess2.id,
    },
  });

  await prisma.risk.create({
    data: {
      id: "risk-4",
      title: "Data retention periods not enforced",
      description: "Risk that data retention policies are not being enforced automatically.",
      likelihood: 3,
      impact: 3,
      mitigation: "Implement automated data lifecycle management",
      status: "resolved",
      ownerId: marcus.id,
      assessmentId: assess5.id,
    },
  });

  await prisma.risk.create({
    data: {
      id: "risk-5",
      title: "Lack of DPDPA grievance mechanism",
      description: "No online grievance mechanism in place as required by DPDPA.",
      likelihood: 2,
      impact: 4,
      mitigation: "Create online grievance portal",
      status: "open",
      ownerId: priya.id,
      assessmentId: assess6.id,
    },
  });

  // Create activity logs
  await prisma.activityLog.create({
    data: {
      action: "created",
      entity: "Customer Marketing Analytics Platform",
      entityType: "assessment",
      details: "New GDPR assessment created for marketing analytics platform",
      userId: sarah.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "updated",
      entity: "Customer Marketing Analytics Platform",
      entityType: "assessment",
      details: "Assessment status changed to in_review",
      userId: marcus.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "created",
      entity: "Unauthorized access to customer marketing data",
      entityType: "risk",
      details: "New risk identified with likelihood 3 and impact 4",
      userId: sarah.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "updated",
      entity: "California Consumer Mobile App",
      entityType: "assessment",
      details: "Assessment approved and all risks addressed",
      userId: tom.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: "created",
      entity: "HR Employee Data Processing",
      entityType: "assessment",
      details: "Assessment closed with all recommendations implemented",
      userId: marcus.id,
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
