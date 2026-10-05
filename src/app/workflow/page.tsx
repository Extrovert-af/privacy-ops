"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Send,
  UserCheck,
  ShieldCheck,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { api, formatDate } from "@/lib/storage";
import { Card, Badge, Button, PageHeader } from "@/components/ui";
import { workflowStages } from "@/data/organization";
import { assessmentTemplates } from "@/data/templates";
import type { Assessment } from "@/lib/types";

const stageIcons: Record<number, React.ReactNode> = {
  1: <Send className="h-4 w-4" />,
  2: <AlertCircle className="h-4 w-4" />,
  3: <UserCheck className="h-4 w-4" />,
  4: <ShieldCheck className="h-4 w-4" />,
};

const stageColors: Record<number, string> = {
  1: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  2: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-300",
  3: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300",
  4: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300",
};

const canAdvanceRoles = ["admin", "privacy_officer", "reviewer"];

export default function WorkflowPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.getAssessments()
      .then((a) => { if (!cancelled) setAssessments(a); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const { data: session } = useSession();
  const canAdvance = canAdvanceRoles.includes(session?.user?.role ?? "");

  const advanceWorkflow = async (a: Assessment) => {
    const nextStage = Math.min(a.workflowStage + 1, 4);
    const nextStatus = nextStage === 4 ? "approved" : "in_review";
    try {
      const updated = await api.updateAssessment(a.id, { workflowStage: nextStage, status: nextStatus });
      setAssessments((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to advance workflow");
    }
  };

  const grouped = useMemo(() => {
    const active = assessments.filter((a) => a.status === "in_review" || a.status === "draft");
    const completed = assessments.filter((a) => a.status === "approved" || a.status === "closed");
    return { active, completed };
  }, [assessments]);

  const list = filter === "active" ? grouped.active : grouped.completed;

  const getTemplateName = (templateId: string) =>
    assessmentTemplates.find((t) => t.id === templateId)?.name ?? "Unknown";

  const getWorkflowStage = (a: Assessment) =>
    workflowStages.find((w) => w.id === a.workflowStage) ?? workflowStages[0];

  return (
    <div>
      <PageHeader
        title="Workflow Management"
        description="Track and manage PIA/DPIA assessments through the review cycle"
        actions={
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setFilter("active")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === "active" ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"
              }`}
            >
              Active ({grouped.active.length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === "completed" ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"
              }`}
            >
              Completed ({grouped.completed.length})
            </button>
          </div>
        }
      />

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-none" />
          {errorMsg}
        </div>
      )}

      {list.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">No assessments in this queue</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const stage = getWorkflowStage(a);
            const stageIdx = workflowStages.findIndex((w) => w.id === a.workflowStage);
            const isCompleted = a.status === "approved" || a.status === "closed";
            return (
              <Card key={a.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <Link href={`/assessments/${a.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600 dark:text-slate-100">
                        {a.title}
                      </Link>
                      <Badge color="blue" className="font-mono">{a.regulation}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {getTemplateName(a.templateId)} · {a.department} · Due {formatDate(a.dueDate)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">Owner: {a.assigneeName}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${stageColors[stage.id]}`}>
                      {stageIcons[stage.id]}
                      {stage.name}
                    </div>
                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCheck className="h-3.5 w-3.5" /> Completed
                      </span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/assessments/${a.id}`}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Continue
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                        {canAdvance && (
                          <Button size="sm" onClick={() => advanceWorkflow(a)}>
                            Advance
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stage progress */}
                <div className="mt-4 flex items-center gap-1">
                  {workflowStages.map((ws, idx) => {
                    const reached = isCompleted || idx <= stageIdx;
                    return (
                      <div key={ws.id} className="flex flex-1 items-center last:flex-none">
                        <div className="flex-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              reached ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                            }`}
                          />
                        </div>
                        {idx < workflowStages.length - 1 && (
                          <div className={`h-1.5 w-2 ${reached ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  {workflowStages.map((ws) => (
                    <span key={ws.id} className="flex-1">{ws.name}</span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
