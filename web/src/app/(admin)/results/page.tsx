"use client";

// History of every "Generate": template + prompt version, when, and the notes. View, delete, or download all
// (the results in the current filter) as a ZIP of Word files with notes, transcript and prompt.
import { Download, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { buttonClass } from "@/components/fields";
import { Modal } from "@/components/modal";
import { NoteView } from "@/components/note-view";
import { NoteActions } from "@/components/notes-modal";
import { useToast } from "@/components/toast";
import { ErrorBanner, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import { versionSoft } from "@/lib/version-colors";
import type { Generation, TemplateSummary } from "@/lib/types";

export default function ResultsPage() {
  const [items, setItems] = useState<Generation[] | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState("all");
  const [open, setOpen] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const filter = templateId === "all" ? undefined : Number(templateId);

  useEffect(() => {
    api.templates().then(setTemplates).catch(() => {});
  }, []);
  useEffect(() => {
    api
      .generations(filter, 500)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [filter]);

  const remove = async (g: Generation) => {
    setError(null);
    setItems((list) => (list ?? []).filter((x) => x.id !== g.id));
    try {
      await api.deleteGeneration(g.id);
      toast.show("Result deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      api.generations(filter, 500).then(setItems).catch(() => {});
    }
  };

  const downloadAll = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadResults(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div data-testid="results-page">
      <PageHeader
        title="Results"
        actions={
          <>
            <Select
              value={templateId}
              onChange={setTemplateId}
              options={[{ value: "all", label: "All templates" }, ...templates.map((t) => ({ value: String(t.id), label: t.name, group: t.group_name }))]}
              ariaLabel="Template"
              className="w-72"
              searchPlaceholder="Search templates"
              matchWidth
            />
            <button type="button" onClick={downloadAll} disabled={downloading || !items?.length} className={buttonClass.primary} data-testid="download-all">
              {downloading ? <Spinner /> : <Download className="size-4" />} Download all{items?.length ? ` (${items.length})` : ""}
            </button>
          </>
        }
      />
      {error && <ErrorBanner message={error} />}
      {!items ? (
        <div className="grid place-items-center py-16 text-brand">
          <Spinner className="size-7" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">
          No results yet. Open a <Link href="/prompts" className="font-semibold text-brand">prompt</Link>, paste a transcript and press Generate.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((g) => (
              <li key={g.id} className="flex items-center gap-2.5 px-4 py-2" data-testid="result-row">
                <span className={`size-2 shrink-0 rounded-full ${g.success ? "bg-success" : "bg-danger"}`} aria-label={g.success ? "Success" : "Failed"} />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{g.template_name ?? "Free prompt"}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${g.prompt_version ? versionSoft(g.prompt_version) : "bg-warning/15 text-warning"}`}
                    data-testid="result-version"
                  >
                    {g.prompt_version ? `Version ${g.prompt_version}` : "Unsaved draft"}
                  </span>
                  {!g.success && <span className="truncate text-xs text-danger">{g.error}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(g.created_at)}</span>
                <button
                  type="button"
                  onClick={() => setOpen(g)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 px-2.5 text-xs font-semibold text-brand hover:bg-brand-soft"
                >
                  <Eye className="size-3.5" /> View
                </button>
                <button
                  type="button"
                  onClick={() => remove(g)}
                  aria-label="Delete result"
                  title="Delete result"
                  data-testid="delete-result"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && (
        <Modal
          title={`${open.template_name ?? "Free prompt"} · ${open.prompt_version ? `version ${open.prompt_version}` : "unsaved draft"}`}
          onClose={() => setOpen(null)}
          actions={<NoteActions generation={open} />}
        >
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
      {toast.toast}
    </div>
  );
}
