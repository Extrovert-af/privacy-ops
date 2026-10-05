"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight } from "lucide-react";
import { api, formatDate } from "@/lib/storage";
import { Card, Badge, Button, ProgressBar, PageHeader } from "@/components/ui";
import { regulations } from "@/data/organization";
import { assessmentTemplates } from "@/data/templates";
import type { Assessment } from "@/lib/types";

const statusColors: Record<string, "blue" | "green" | "yellow" | "red" | "slate"> = {
  draft: "slate",
  in_review: "blue",
  approved: "green",
  rejected: "red",
  closed: "green",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
};

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    api.getAssessments()
      .then((a) => { if (!cancelled) setAssessments(a); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return assessments
      .filter((a) => {
        const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.stakeholder.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || a.status === filter || a.regulation === filter;
        return matchesSearch && (filter === "all" ? true : matchesFilter);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [assessments, search, filter]);

  const getTemplateName = (templateId: string) => {
    return assessmentTemplates.find((t) => t.id === templateId)?.name ?? "Unknown Template";
  };

  const getCompletion = (a: Assessment) => {
    const template = assessmentTemplates.find((t) => t.id === a.templateId);
    if (!template) return 0;
    const totalQuestions = template.sections.flatMap((s) => s.questions).length;
    if (totalQuestions === 0) return 0;
    return Math.round((a.responses.length / totalQuestions) * 100);
  };

  return (
    <div>
      <PageHeader
        title="PIA / DPIA Assessments"
        description="Privacy Impact Assessments and Data Protection Impact Assessments"
        actions={
          <Link href="/assessments/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Assessment
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments..."
            className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All Assessments</option>
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="closed">Closed</option>
          <option value="rejected">Rejected</option>
          <optgroup label="Regulation">
            {regulations.map((r) => (
              <option key={r.key} value={r.key}>{r.key}</option>
            ))}
          </optgroup>
        </select>
        <span className="text-xs text-slate-500">{filtered.length} results</span>
      </div>

      {/* Assessment cards */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">No assessments found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const completion = getCompletion(a);
            return (
              <Link key={a.id} href={`/assessments/${a.id}`} className="group">
                <Card className="h-full p-5 transition-all hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700">
                  <div className="mb-3 flex items-start justify-between">
                    <Badge color="blue" className="font-mono">{a.regulation}</Badge>
                    <Badge color={statusColors[a.status]}>{statusLabels[a.status]}</Badge>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{getTemplateName(a.templateId)}</p>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Completion</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{completion}%</span>
                    </div>
                    <ProgressBar value={completion} color={completion === 100 ? "green" : "blue"} />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
                    <span>Owner: {a.assigneeName}</span>
                    <span className="flex items-center gap-1">
                      Due {formatDate(a.dueDate)}
                      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
