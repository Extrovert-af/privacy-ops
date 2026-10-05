import type { Regulation, User, WorkflowStage, DocumentTemplate } from "../lib/types";

export const regulations: Regulation[] = [
  {
    key: "GDPR",
    name: "General Data Protection Regulation",
    region: "European Union",
    description: "EU regulation on data protection and privacy in the European Union and European Economic Area",
    color: "#2563eb",
  },
  {
    key: "CCPA",
    name: "California Consumer Privacy Act",
    region: "United States (California)",
    description: "State statute intended to enhance privacy rights and consumer protection for residents of California",
    color: "#9333ea",
  },
  {
    key: "HIPAA",
    name: "Health Insurance Portability and Accountability Act",
    region: "United States",
    description: "US legislation that provides data privacy and security provisions for safeguarding medical information",
    color: "#dc2626",
  },
  {
    key: "PIPEDA",
    name: "Personal Information Protection and Electronic Documents Act",
    region: "Canada",
    description: "Canadian federal law governing how private-sector organizations collect, use and disclose personal information",
    color: "#059669",
  },
  {
    key: "DPDPA",
    name: "Digital Personal Data Protection Act",
    region: "India",
    description: "Indian legislation governing the processing of digital personal data",
    color: "#d97706",
  },
  {
    key: "PIPL",
    name: "Personal Information Protection Law",
    region: "China",
    description: "Chinese law regulating the handling of personal information and data privacy",
    color: "#0d9488",
  },
];

export const users: User[] = [
  {
    id: "user-1",
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    role: "admin",
    department: "Privacy Office",
    avatarColor: "#2563eb",
    active: true,
  },
  {
    id: "user-2",
    name: "Marcus Johnson",
    email: "marcus.j@company.com",
    role: "privacy_officer",
    department: "Legal & Compliance",
    avatarColor: "#9333ea",
    active: true,
  },
  {
    id: "user-3",
    name: "Priya Sharma",
    email: "priya.s@company.com",
    role: "reviewer",
    department: "Data Governance",
    avatarColor: "#059669",
    active: true,
  },
  {
    id: "user-4",
    name: "Tom Wilson",
    email: "tom.w@company.com",
    role: "assessor",
    department: "Engineering",
    avatarColor: "#d97706",
    active: true,
  },
  {
    id: "user-5",
    name: "Emma Rodriguez",
    email: "emma.r@company.com",
    role: "viewer",
    department: "Operations",
    avatarColor: "#dc2626",
    active: true,
  },
];

export const workflowStages: WorkflowStage[] = [
  {
    id: 1,
    name: "Initial Assessment",
    description: "Assessor completes PIA/DPIA questionnaire",
    minRole: "assessor",
    icon: "file-text",
  },
  {
    id: 2,
    name: "Risk Evaluation",
    description: "Identify and analyze privacy risks",
    minRole: "reviewer",
    icon: "shield-alert",
  },
  {
    id: 3,
    name: "DPO Review",
    description: "Data Protection Officer review and approval",
    minRole: "privacy_officer",
    icon: "user-check",
  },
  {
    id: 4,
    name: "Final Approval",
    description: "Final sign-off and closure",
    minRole: "admin",
    icon: "check-circle",
  },
];

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "doc-1",
    name: "PIA/DPIA Report",
    description: "Complete assessment report with findings",
    type: "PIADPIA",
    format: "pdf",
    lastGenerated: "2026-09-01",
  },
  {
    id: "doc-2",
    name: "Risk Register",
    description: "Comprehensive privacy risk register export",
    type: "RiskRegister",
    format: "docx",
    lastGenerated: "2026-08-28",
  },
  {
    id: "doc-3",
    name: "Compliance Report",
    description: "Regulatory compliance summary report",
    type: "ComplianceReport",
    format: "pdf",
    lastGenerated: "2026-08-25",
  },
  {
    id: "doc-4",
    name: "Audit Log",
    description: "Full activity audit trail export",
    type: "AuditLog",
    format: "html",
  },
];
