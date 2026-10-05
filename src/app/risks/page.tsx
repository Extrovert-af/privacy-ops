"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { api, formatDate } from "@/lib/storage";
import { Card, Badge, Button, Modal, PageHeader } from "@/components/ui";
import type { Risk, User } from "@/lib/types";

const riskSeverity = (r: Risk) => {
  const score = r.likelihood * r.impact;
  if (score >= 12) return { label: "High", color: "red" as const, score };
  if (score >= 6) return { label: "Medium", color: "yellow" as const, score };
  return { label: "Low", color: "green" as const, score };
};

export default function RisksPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    likelihood: 3,
    impact: 3,
    mitigation: "",
    owner: "",
    status: "open" as Risk["status"],
  });

  useEffect(() => {
    api.getUsers().then((u) => setUsers(u)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.getRisks().then((r) => { if (!cancelled) setRisks(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let result = risks;
    if (filter === "open") result = risks.filter((r) => r.status === "open");
    if (filter === "mitigating") result = risks.filter((r) => r.status === "mitigating");
    if (filter === "resolved") result = risks.filter((r) => r.status === "resolved");
    return [...result].sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact);
  }, [risks, filter]);

  const statusBadge = (s: Risk["status"]) => {
    switch (s) {
      case "open": return <Badge color="red">Open</Badge>;
      case "mitigating": return <Badge color="yellow">Mitigating</Badge>;
      case "resolved": return <Badge color="green">Resolved</Badge>;
    }
  };

  const openNew = () => {
    setEditingRisk(null);
    setErrorMsg("");
    setForm({
      title: "",
      description: "",
      likelihood: 3,
      impact: 3,
      mitigation: "",
      owner: users[0]?.id || "",
      status: "open" as Risk["status"],
    });
    setShowModal(true);
  };

  const openEdit = (risk: Risk) => {
    setEditingRisk(risk);
    setErrorMsg("");
    setForm({
      title: risk.title,
      description: risk.description,
      likelihood: risk.likelihood,
      impact: risk.impact,
      mitigation: risk.mitigation,
      owner: risk.ownerId,
      status: risk.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      let updated: Risk;
      if (editingRisk) {
        updated = await api.updateRisk(editingRisk.id, {
          title: form.title,
          description: form.description,
          likelihood: form.likelihood as 1 | 2 | 3 | 4 | 5,
          impact: form.impact as 1 | 2 | 3 | 4 | 5,
          mitigation: form.mitigation,
          ownerId: form.owner,
          status: form.status,
        });
        setRisks((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        updated = await api.createRisk({
          title: form.title,
          description: form.description,
          likelihood: form.likelihood as 1 | 2 | 3 | 4 | 5,
          impact: form.impact as 1 | 2 | 3 | 4 | 5,
          mitigation: form.mitigation,
          ownerId: form.owner,
          status: form.status,
        });
        setRisks((prev) => [updated, ...prev]);
      }
      setShowModal(false);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save risk");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteRisk(id);
    setRisks((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResolve = async (risk: Risk) => {
    await api.updateRisk(risk.id, { status: "resolved" as const });
    setRisks((prev) => prev.map((r) => (r.id === risk.id ? { ...r, status: "resolved" as const } : r)));
  };

  const counts = useMemo(() => ({
    open: risks.filter((r) => r.status === "open").length,
    mitigating: risks.filter((r) => r.status === "mitigating").length,
    resolved: risks.filter((r) => r.status === "resolved").length,
    high: risks.filter((r) => r.likelihood * r.impact >= 12).length,
  }), [risks]);

  return (
    <div>
      <PageHeader
        title="Risk Register"
        description="Identify, track, and mitigate privacy risks"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add Risk
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold">{risks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Open</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{counts.open}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Mitigating</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{counts.mitigating}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">High Priority</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{counts.high}</p>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["all", "open", "mitigating", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Risk list */}
      <div className="space-y-3">
        {filtered.map((risk) => {
          const severity = riskSeverity(risk);
          return (
            <Card key={risk.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{risk.title}</h4>
                    <Badge color={severity.color}>{severity.label}</Badge>
                    {statusBadge(risk.status)}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{risk.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>Owner: <span className="font-medium">{risk.ownerName}</span></span>
                    <span>Created: {formatDate(risk.createdAt)}</span>
                    <span>Score: {severity.score}/25</span>
                  </div>
                  {risk.mitigation && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                      <span className="font-semibold">Mitigation:</span> {risk.mitigation}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(risk)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(risk.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {risk.status !== "resolved" && (
                    <Button variant="success" size="sm" onClick={() => handleResolve(risk)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title={editingRisk ? "Edit Risk" : "Add New Risk"}
        description={editingRisk ? "Update risk details and mitigation" : "Identify a new privacy risk"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Risk Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Data breach due to weak access controls"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe the risk..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Likelihood (1-5)</label>
              <select
                value={form.likelihood}
                onChange={(e) => setForm({ ...form, likelihood: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} - {n === 1 ? "Rare" : n === 2 ? "Unlikely" : n === 3 ? "Possible" : n === 4 ? "Likely" : "Almost certain"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Impact (1-5)</label>
              <select
                value={form.impact}
                onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} - {n === 1 ? "Negligible" : n === 2 ? "Minor" : n === 3 ? "Moderate" : n === 4 ? "Major" : "Severe"}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Mitigation Plan</label>
            <textarea
              value={form.mitigation}
              onChange={(e) => setForm({ ...form, mitigation: e.target.value })}
              rows={2}
              placeholder="How will this risk be mitigated?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Owner</label>
              <select
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Risk["status"] })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="open">Open</option>
                <option value="mitigating">Mitigating</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
              {errorMsg}
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={!form.title.trim() || saving}>
            {saving ? "Saving..." : editingRisk ? "Update Risk" : "Add Risk"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
