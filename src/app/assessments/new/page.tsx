"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardCheck, AlertCircle } from "lucide-react";
import { Card, PageHeader, Button } from "@/components/ui";
import { regulations } from "@/data/organization";
import { assessmentTemplates } from "@/data/templates";
import { api } from "@/lib/storage";

export default function NewAssessmentPage() {
  const router = useRouter();
  const [selectedRegulation, setSelectedRegulation] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [stakeholder, setStakeholder] = useState("");
  const [department, setDepartment] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const filteredTemplates = assessmentTemplates.filter(
    (t) => selectedRegulation === "all" || t.regulation === selectedRegulation
  );

  const handleCreate = async () => {
    if (!title.trim() || !selectedTemplateId) {
      setError("Please provide a title and select a template.");
      return;
    }
    setCreating(true);
    try {
      const template = assessmentTemplates.find((t) => t.id === selectedTemplateId)!;
      const created = await api.createAssessment({
        title: title.trim(),
        templateId: template.id,
        regulation: template.regulation,
        stakeholder,
        department,
        dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        risksTotal: template.sections.flatMap((s) => s.questions).length,
      });
      router.push(`/assessments/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create assessment");
      setCreating(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => router.push("/assessments")}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Assessments
      </button>

      <PageHeader
        title="Create New Assessment"
        description="Select a regulatory template and configure your PIA/DPIA"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Template selection */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">1. Select Regulation</h3>
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedRegulation("all")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedRegulation === "all"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                All
              </button>
              {regulations.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setSelectedRegulation(r.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedRegulation === r.key
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {r.key}
                </button>
              ))}
            </div>

            <h3 className="mb-4 text-sm font-semibold">2. Choose Template</h3>
            <div className="space-y-3">
              {filteredTemplates.map((t) => {
                const reg = regulations.find((r) => r.key === t.regulation);
                const totalQuestions = t.sections.flatMap((s) => s.questions).length;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${
                      selectedTemplateId === t.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: reg?.color ?? "#64748b", opacity: 0.15 }}
                        >
                          <ClipboardCheck className="h-4 w-4" style={{ color: reg?.color ?? "#64748b" }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
                            <span className="text-xs text-slate-400">v{t.version}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {t.sections.length} sections · {totalQuestions} questions
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Details form */}
        <div className="lg:col-span-1">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">3. Assessment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Assessment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Customer Analytics Platform"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Stakeholder</label>
                <input
                  type="text"
                  value={stakeholder}
                  onChange={(e) => setStakeholder(e.target.value)}
                  placeholder="e.g., Marketing Department"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Marketing"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="mt-5 w-full"
              onClick={handleCreate}
              disabled={!title.trim() || !selectedTemplateId || creating}
            >
              {creating ? "Creating..." : "Create Assessment"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
