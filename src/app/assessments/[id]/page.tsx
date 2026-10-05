"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  User,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { api, formatDate } from "@/lib/storage";
import { Card, Badge, Button } from "@/components/ui";
import { assessmentTemplates } from "@/data/templates";
import { workflowStages } from "@/data/organization";
import type { Assessment, AssessmentQuestionResponse, TemplateQuestion, TemplateSection } from "@/lib/types";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
};

const statusColors: Record<string, "blue" | "green" | "yellow" | "red" | "slate"> = {
  draft: "slate",
  in_review: "blue",
  approved: "green",
  rejected: "red",
  closed: "green",
};

export default function AssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<Record<string, string | string[] | boolean>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getAssessment(params.id)
      .then((a) => {
        if (cancelled) return;
        setAssessment(a);
        const respMap: Record<string, string | string[] | boolean> = {};
        a.responses.forEach((r) => {
          respMap[r.questionId] = r.response;
        });
        setResponses(respMap);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (notFound || !assessment) {
    return <div className="p-12 text-center text-slate-500">Assessment not found</div>;
  }

  const template = assessmentTemplates.find((t) => t.id === assessment.templateId);

  if (!template) {
    return <div className="p-12 text-center text-slate-500">Template not found</div>;
  }

  const allQuestions = template.sections.flatMap((s: TemplateSection) => s.questions);
  const totalQuestions = allQuestions.length;
  const completedCount = Object.keys(responses).filter((qid) => {
    const val = responses[qid];
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "boolean") return true;
    return (val ?? "").trim() !== "";
  }).length;
  const completionPct = totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0;

  const handleResponseChange = (questionId: string, value: string | string[] | boolean) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!assessment) return;
    setSaving(true);
    try {
      const respArray: AssessmentQuestionResponse[] = Object.entries(responses).map(
        ([questionId, response]) => ({ questionId, response })
      );
      const updated = await api.updateAssessment(assessment.id, { responses: respArray });
      setAssessment(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    setSaving(true);
    try {
      const updated = await api.updateAssessment(assessment.id, {
        status: "in_review",
        workflowStage: 2,
      });
      setAssessment(updated);
      setErrorMsg("");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  const renderQuestion = (question: TemplateQuestion) => {
    const value = responses[question.id];

    switch (question.type) {
      case "text":
        return (
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Your answer..."
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
          />
        );
      case "textarea":
        return (
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            placeholder="Your answer..."
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
          />
        );
      case "yes-no":
        return (
          <div className="mt-2 flex gap-2">
            {["yes", "no"].map((opt) => (
              <button
                key={opt}
                onClick={() => handleResponseChange(question.id, opt === "yes")}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  value === (opt === "yes")
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {opt === "yes" ? "Yes" : "No"}
              </button>
            ))}
          </div>
        );
      case "select":
        return (
          <select
            value={(value as string) ?? ""}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Select an option...</option>
            {question.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <div className="mt-2 space-y-1.5">
            {question.options?.map((opt) => {
              const arr = Array.isArray(value) ? value : [];
              const checked = arr.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const newArr = checked ? arr.filter((x) => x !== opt) : [...arr, opt];
                      handleResponseChange(question.id, newArr);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  const currentWorkflowIndex = workflowStages.findIndex((w) => w.id === assessment.workflowStage);

  return (
    <div>
      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {errorMsg}
        </div>
      )}
      <button
        onClick={() => router.push("/assessments")}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Assessments
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{assessment.title}</h1>
            <Badge color="blue" className="font-mono">{assessment.regulation}</Badge>
            <Badge color={statusColors[assessment.status]}>{statusLabels[assessment.status]}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" /> {assessment.assigneeName}
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> {assessment.department}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Due {formatDate(assessment.dueDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> {template.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </Button>
          {assessment.status === "draft" && (
            <Button onClick={handleSubmit} disabled={saving}>
              <Send className="h-4 w-4" /> Submit for Review
            </Button>
          )}
        </div>
      </div>

      {/* Workflow progress */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Workflow Progress</h3>
          <span className="text-xs text-slate-500">{completionPct}% questionnaire complete</span>
        </div>
        <div className="flex items-center">
          {workflowStages.map((stage, idx) => {
            const isCompleted = idx < currentWorkflowIndex;
            const isCurrent = idx === currentWorkflowIndex;
            const stageCompleted = completionPct === 100;
            const isActive = (idx === 0) || (isCompleted) || (isCurrent && stageCompleted);
            return (
              <div key={stage.id} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted || isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isCurrent
                        ? "border-blue-500 text-blue-500"
                        : "border-slate-300 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-xs font-bold">{stage.id}</span>
                    )}
                  </div>
                  <span className={`mt-1.5 whitespace-nowrap text-[11px] font-medium ${isCurrent ? "text-blue-600" : "text-slate-500"}`}>
                    {stage.name}
                  </span>
                </div>
                {idx < workflowStages.length - 1 && (
                  <div
                    className={`mx-2 mb-6 h-0.5 flex-1 rounded ${
                      idx < currentWorkflowIndex ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Questionnaire sections */}
      <div className="mt-6 space-y-4">
        {template.sections.map((section: TemplateSection, sectionIdx: number) => (
          <Card key={section.id} className="p-5">
            <div className="mb-4 border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Section {sectionIdx + 1}: {section.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500">{section.description}</p>
            </div>
            <div className="space-y-6">
              {section.questions.map((question) => (                <div key={question.id}>
                  <label className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-semibold text-slate-400">{question.id.toUpperCase()}</span>
                    <span>
                      {question.text}
                      {question.required && <span className="text-red-500"> *</span>}
                    </span>
                  </label>
                  {question.helpText && (
                    <p className="mt-1 text-xs text-slate-400">{question.helpText}</p>
                  )}
                  {renderQuestion(question)}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {completedCount} of {totalQuestions} questions answered
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </Button>
          {assessment.status === "draft" && (
            <Button onClick={handleSubmit} disabled={saving}>
              <Send className="h-4 w-4" /> Submit for Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
