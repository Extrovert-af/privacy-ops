export type RegulationKey = "GDPR" | "CCPA" | "HIPAA" | "PIPEDA" | "DPDPA" | "PIPL";

export type AssessmentStatus = "draft" | "in_review" | "approved" | "rejected" | "closed";

export type RiskLevel = "low" | "medium" | "high";

export type UserRole = "admin" | "privacy_officer" | "reviewer" | "assessor" | "viewer";

export interface Regulation {
  key: RegulationKey;
  name: string;
  region: string;
  description: string;
  color: string;
}

export interface TemplateQuestion {
  id: string;
  text: string;
  type: "text" | "textarea" | "select" | "yes-no" | "checkbox";
  required?: boolean;
  options?: string[];
  helpText?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  questions: TemplateQuestion[];
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  regulation: RegulationKey;
  version: string;
  description: string;
  sections: TemplateSection[];
}

export interface AssessmentQuestionResponse {
  questionId: string;
  response: string | string[] | boolean;
}

export interface Assessment {
  id: string;
  title: string;
  templateId: string;
  regulation: RegulationKey;
  status: AssessmentStatus;
  stakeholder: string;
  department: string;
  createdBy: string;
  assigneeId: string;
  assigneeName: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  responses: AssessmentQuestionResponse[];
  risksIdentified: number;
  risksTotal: number;
  riskCount: number;
  workflowStage: number;
  notes?: string;
  reviewCycle: number;
  lastReviewedAt: string | null;
  reviewDueDate: string | null;
  completedAt: string | null;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  mitigation: string;
  ownerId: string;
  ownerName: string;
  status: "open" | "mitigating" | "resolved";
  assessmentId?: string | null;
  assessmentTitle?: string | null;
  assessmentRegulation?: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarColor: string;
  active: boolean;
}

export interface WorkflowStage {
  id: number;
  name: string;
  description: string;
  minRole: UserRole;
  icon: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: "PIADPIA" | "RiskRegister" | "ComplianceReport" | "AuditLog";
  regulation?: RegulationKey;
  format: "pdf" | "docx" | "html";
  lastGenerated?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityType: string;
  userId: string;
  userName: string;
  timestamp: string;
  details?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  kind: string;
  link: string | null;
  read: boolean;
  createdAt: string;
  userId: string;
}

export type ComplianceScope = "full" | "summary";

export type { RiskBand } from "@/lib/risk";

import type { RiskBand } from "@/lib/risk";

export interface ComplianceDeadlineItem {
  id: string;
  title: string;
  regulation: string;
  status: string;
  department: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  reviewCycle: number;
  reviewDueDate: string | null;
  /// Days until the deadline; negative means overdue.
  daysRemaining: number;
}

export interface RegulationCount {
  regulation: string;
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

export interface DepartmentCount {
  department: string;
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

export interface RiskBandCount {
  band: RiskBand;
  label: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface RiskExposure {
  openTotal: number;
  closedTotal: number;
  averageScore: number | null;
  bands: RiskBandCount[];
}

export interface ComplianceTotals {
  assessments: number;
  openAssessments: number;
  closedAssessments: number;
  complianceRate: number;
  overdueCount: number;
  dueSoonCount: number;
  reReviewDueCount: number;
  risks: number;
  openRisks: number;
  users: number;
}

export interface ComplianceMetrics {
  generatedAt: string;
  today: string;
  role: string;
  scope: ComplianceScope;
  regulation: string | null;
  totals: ComplianceTotals;
  byStatus: Record<string, number>;
  byRegulation: RegulationCount[];
  overdue: ComplianceDeadlineItem[];
  dueSoon: ComplianceDeadlineItem[];
  reReviewDue: ComplianceDeadlineItem[];
  /// Null for roles without reviewer-level visibility.
  riskExposure: RiskExposure | null;
  averageCycleTimeDays: number | null;
  byDepartment: DepartmentCount[] | null;
}

export interface DeadlineRunResult {
  today: string;
  scanned: number;
  created: number;
  skipped: number;
}