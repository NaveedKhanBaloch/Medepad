"use client";

// History of every "Generate": which template and prompt version, who, how long, and the notes it produced.
import { Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { Modal } from "@/components/modal";
import { NoteView } from "@/components/note-view";
import { ErrorBanner, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import type { Generation, TemplateSummary } from "@/lib/types";

export default function ResultsPage() {
  const [items, setItems] = useState<Generation[] | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState("all");
  const [open, setOpen] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.templates().then(setTemplates).catch(() => {});
  }, []);
  useEffect(() => {
    api
      .generations(templateId === "all" ? undefined : Number(templateId), 100)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [templateId]);

  return (
    <div data-testid="results-page">
      <PageHeader
        title="Results"
        subtitle="Every note generated here, with the exact prompt and transcript used. Kept for comparing with the clinical app later."
        actions={
          <Select
            value={templateId}
            onChange={setTemplateId}
            options={[{ value: "all", label: "All templates" }, ...templates.map((t) => ({ value: String(t.id), label: t.name, group: t.group_name }))]}
            ariaLabel="Template"
            className="w-72"
            searchPlaceholder="Search templates"
          />
        }
      />
      {error && <ErrorBanner message={error} />}
      {!items ? (
        <div className="grid place-items-center py-16 text-brand">
          <Spinner className="size-7" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          No results yet. Open a <Link href="/templates" className="font-semibold text-brand">template</Link>, paste a transcript and press Generate.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 px-5 py-3" data-testid="result-row">
                <span className={`size-2.5 shrink-0 rounded-full ${g.success ? "bg-success" : "bg-danger"}`} aria-label={g.success ? "Success" : "Failed"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{g.template_name ?? "Free prompt"}</span>
                  <span className="block truncate text-xs text-muted">
                    {g.prompt_version ? `Version ${g.prompt_version}` : "Unsaved draft"} · {g.language.toUpperCase()} · {g.model} · {(g.latency_ms / 1000).toFixed(1)} s ·{" "}
                    {g.created_by_name}
                  </span>
                  {!g.success && <span className="block truncate text-xs text-danger">{g.error}</span>}
                </span>
                <span className="text-xs text-muted">{timeAgo(g.created_at)}</span>
                <button type="button" onClick={() => setOpen(g)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand/40 px-3 text-sm font-semibold text-brand hover:bg-brand-soft">
                  <Eye className="size-4" /> View
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && (
        <Modal title={`${open.template_name ?? "Free prompt"} · ${open.prompt_version ? `version ${open.prompt_version}` : "unsaved draft"}`} onClose={() => setOpen(null)}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Transcript</h4>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-sm text-ink">{open.transcript}</pre>
              </div>
              <div>
                <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Prompt used</h4>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink">{open.prompt_text}</pre>
              </div>
            </div>
            <div>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">Notes</h4>
              {open.result ? <NoteView note={open.result} language={open.language} /> : <ErrorBanner message={open.error ?? "No result"} />}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
