"use client";

// The prompt behind one template: its versions (v1, v2 ... one "in use"), the editor and the test panel.
import clsx from "clsx";
import { ArrowLeft, Check, CheckCircle2, FileStack, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { buttonClass, TextArea } from "@/components/fields";
import { TestPanel } from "@/components/test-panel";
import { useToast } from "@/components/toast";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import { versionSoft, versionSolid } from "@/lib/version-colors";
import type { Template } from "@/lib/types";

export default function PromptEditorPage() {
  const id = Number(useParams<{ id: string }>().id);
  const [t, setT] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const show = useCallback((data: Template, promptId?: number | null) => {
    setT(data);
    const pick = data.prompts.find((p) => p.id === promptId) ?? data.prompts.find((p) => p.id === data.active_prompt_id) ?? data.prompts[0];
    setSelectedId(pick?.id ?? null);
    setText(pick?.content ?? "");
  }, []);

  useEffect(() => {
    api.template(id).then((d) => show(d)).catch((e) => setError(e.message));
  }, [id, show]);

  if (error && !t) return <ErrorBanner message={error} />;
  if (!t)
    return (
      <div className="grid place-items-center py-20 text-brand">
        <Spinner className="size-7" />
      </div>
    );

  const selected = t.prompts.find((p) => p.id === selectedId) ?? null;
  const changed = !selected || text.trim() !== selected.content.trim();

  const save = async (activate: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const p = await api.savePrompt(t.id, text, note, activate);
      setNote("");
      show(await api.template(t.id), p.id);
      toast.show(activate ? `Saved as version ${p.version} and put in use` : `Saved as version ${p.version}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const activateVersion = async (promptId: number) => {
    setError(null);
    try {
      const updated = await api.setActivePrompt(t.id, promptId);
      show(updated, promptId);
      toast.show(`Version ${updated.active_version} is now in use`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4" data-testid="template-page">
      <Link href="/prompts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Prompts
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-extrabold text-ink" data-testid="template-name">
            {t.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold text-ink-2">{t.group_name || "Other"}</span>
            <span
              className={clsx("rounded-full px-2.5 py-0.5 font-semibold", t.active_version ? versionSoft(t.active_version) : "bg-danger-soft text-danger")}
              data-testid="in-use-badge"
            >
              {t.active_version ? `Version ${t.active_version} in use` : "No version in use"}
            </span>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold text-ink-2">{t.sections.join(" · ")}</span>
          </div>
        </div>
        <Link href={`/templates/${t.id}`} className={buttonClass.secondary}>
          <FileStack className="size-4" /> Template details
        </Link>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="card p-5" data-testid="prompt-editor">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold text-ink">Prompt</h3>
            <span className={clsx("text-xs font-semibold", changed ? "text-warning" : "text-muted")} data-testid="editor-state">
              {changed ? "Unsaved changes" : selected ? `Showing version ${selected.version}` : ""}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Versions">
            {t.prompts.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === selectedId}
                onClick={() => {
                  setSelectedId(p.id);
                  setText(p.content);
                }}
                data-testid="version-chip"
                className={clsx(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
                  p.id === selectedId ? `${versionSolid(p.version)} shadow-sm` : `${versionSoft(p.version)} border-transparent hover:brightness-95`,
                )}
              >
                v{p.version}
                {p.id === t.active_prompt_id && <Check className="size-3.5" aria-label="in use" />}
              </button>
            ))}
          </div>
          {selected && (
            <p className="mt-2 text-xs text-muted">
              Version {selected.version} · {selected.created_by_name ?? "starter"} · {timeAgo(selected.created_at)}
              {selected.change_note ? ` · “${selected.change_note}”` : ""}
              {selected.id === t.active_prompt_id ? " · in use" : ""}
            </p>
          )}
          <TextArea className="mt-3" rows={20} value={text} onChange={(e) => setText(e.target.value)} aria-label="Prompt text" data-testid="prompt-text" spellCheck={false} />
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={255}
              placeholder="What changed? (optional)"
              aria-label="Change note"
              className="h-10 min-w-0 rounded-xl border border-line bg-surface px-3 text-sm text-ink caret-ink outline-none focus:border-brand"
            />
            <button type="button" disabled={!changed || saving || !text.trim()} onClick={() => save(false)} className={buttonClass.secondary} data-testid="save-version">
              <Save className="size-4" /> Save as new version
            </button>
            <button type="button" disabled={!changed || saving || !text.trim()} onClick={() => save(true)} className={buttonClass.primary} data-testid="save-and-use">
              {saving ? <Spinner /> : <CheckCircle2 className="size-4" />} Save & use
            </button>
          </div>
          {selected && !changed && selected.id !== t.active_prompt_id && (
            <button type="button" onClick={() => activateVersion(selected.id)} className={`${buttonClass.secondary} mt-2`} data-testid="use-version">
              <Check className="size-4" /> Use version {selected.version}
            </button>
          )}
        </section>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <TestPanel templateId={t.id} promptId={selectedId} promptText={text} sections={t.sections} includeCodes={t.include_codes} isDraft={changed} />
        </div>
      </div>
      {toast.toast}
    </div>
  );
}
