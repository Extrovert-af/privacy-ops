"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  File,
  Globe,
  ShieldCheck,
  Activity,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Card, Badge, Button, Modal, PageHeader } from "@/components/ui";
import { documentTemplates } from "@/data/organization";
import { api, formatDate } from "@/lib/storage";
import type { Assessment, DocumentTemplate } from "@/lib/types";

const formatBadge = (f: DocumentTemplate["format"]) => {
  switch (f) {
    case "pdf":
      return <Badge color="red">PDF</Badge>;
    case "docx":
      return <Badge color="blue">DOCX</Badge>;
    case "html":
      return <Badge color="slate">HTML</Badge>;
    default:
      return null;
  }
};

export default function DocumentsPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentTemplate | null>(null);
  const [generated, setGenerated] = useState<string[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAssessments()
      .then(setAssessments)
      .catch(() => {});
  }, []);

  const handleGenerate = (doc: DocumentTemplate) => {
    setSelectedDoc(doc);
    setShowPreview(true);
    setError(null);
  };

  const triggerDownload = (assessmentId: string, format: "pdf" | "docx") => {
    setLoading(true);
    setError(null);
    fetch(`/api/documents/${assessmentId}?format=${format}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          throw new Error(body.error || `Download failed (${res.status})`);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === "pdf" ? "pdf" : "docx";
        a.download = `PIA-${assessmentId}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Download failed";
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const confirmGenerate = () => {
    if (selectedDoc) {
      const candidates = assessments.filter((a) => a.status === "approved" || a.status === "closed");
      if (candidates.length > 0) {
        const chosen = candidates[0];
        const fmt = selectedDoc.format === "docx" ? "docx" : "pdf";
        setGenerated((prev) => (prev.includes(selectedDoc.id) ? prev : [...prev, selectedDoc.id]));
        triggerDownload(chosen.id, fmt);
      } else {
        setError("No approved or closed assessments available for download");
      }
    }
    setShowPreview(false);
  };

  const activeDocs = generated.length;
  const totalAssessments = assessments.length;
  const closedAssessments = assessments.filter((a) => a.status === "approved" || a.status === "closed").length;

  return (
    <div>
      <PageHeader
        title="Document Generation"
        description="Generate compliance documents and reports"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Documents Generated</p>
          <p className="mt-1 text-2xl font-bold">{activeDocs}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Assessments</p>
          <p className="mt-1 text-2xl font-bold">{totalAssessments}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Compliance Rate</p>
          <p className="mt-1 text-2xl font-bold">
            {totalAssessments > 0 ? Math.round((closedAssessments / totalAssessments) * 100) : 0}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {documentTemplates.map((doc) => (
          <Card key={doc.id} className="flex flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              {formatBadge(doc.format)}
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.name}</h3>
            <p className="mt-1 flex-1 text-xs text-slate-500">{doc.description}</p>
            <div className="mt-3 text-xs text-slate-400">
              {doc.lastGenerated ? (
                <>Last generated: {formatDate(doc.lastGenerated)}</>
              ) : (
                "Not yet generated"
              )}
            </div>
            <Button
              className="mt-4 w-full"
              variant={generated.includes(doc.id) ? "success" : "primary"}
              size="sm"
              onClick={() => handleGenerate(doc)}
              disabled={loading}
            >
              {generated.includes(doc.id) ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {loading && generated.includes(doc.id) ? "Generating..." : generated.includes(doc.id) ? "Generated" : "Generate"}
            </Button>
          </Card>
        ))}
      </div>

      {generated.length > 0 && (
        <Card className="mt-8 p-5">
          <h3 className="mb-4 text-sm font-semibold">Recently Generated</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {documentTemplates
              .filter((d) => generated.includes(d.id))
              .map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{doc.name}</p>
                      <p className="text-xs text-slate-400">
                        {doc.format.toUpperCase()} · Generated {formatDate(new Date().toISOString().slice(0, 10))}
                      </p>
                    </div>
                  </div>
                  <button
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    disabled={loading}
                    onClick={() => {
                      const candidates = assessments.filter((a) => a.status === "approved" || a.status === "closed");
                      if (candidates.length > 0) {
                        triggerDownload(candidates[0].id, doc.format === "docx" ? "docx" : "pdf");
                      } else {
                        setError("No approved or closed assessments available for download");
                      }
                    }}
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>
              ))}
          </div>
        </Card>
      )}

      <Modal
        open={showPreview}
        onOpenChange={setShowPreview}
        title="Generate Document"
        description={selectedDoc ? `Generate ${selectedDoc.name}?` : ""}
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-sm">
                {selectedDoc.type === "PIADPIA" && <ShieldCheck className="h-4 w-4 text-green-600" />}
                {selectedDoc.type === "RiskRegister" && <Activity className="h-4 w-4 text-amber-600" />}
                {selectedDoc.type === "ComplianceReport" && <Globe className="h-4 w-4 text-blue-600" />}
                {selectedDoc.type === "AuditLog" && <Calendar className="h-4 w-4 text-purple-600" />}
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedDoc.name}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{selectedDoc.description}</p>
              <p className="mt-2 text-xs text-slate-400">
                Format: <span className="font-medium uppercase">{selectedDoc.format}</span>
              </p>
              {assessments.filter((a) => a.status === "approved" || a.status === "closed").length === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  Warning: No approved/closed assessments exist. Export requires approved or closed status.
                </p>
              )}
            </div>
            <Button className="w-full" onClick={confirmGenerate} disabled={loading}>
              <Download className="h-4 w-4" /> {loading ? "Generating..." : "Generate Document"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
