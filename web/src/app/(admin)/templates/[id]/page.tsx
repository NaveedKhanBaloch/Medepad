"use client";

// One template: its prompt versions (v1, v2 ... one "in use"), the prompt editor, the note headings,
// template details, and the test panel (transcript -> notes) next to the editor.
import clsx from "clsx";
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, ListOrdered, Pencil, Save, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { buttonClass, Field, TextArea, Toggle } from "@/components/fields";
import { Modal } from "@/components/modal";
import { SectionsEditor } from "@/components/sections-editor";
import { TestPanel } from "@/components/test-panel";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import type { Template } from "@/lib/types";

export default function TemplatePage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const [t, setT] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [editingDetails, setEditingDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const show = useCallback((data: Template, promptId?: number | null) => {
    setT(data);
    setSections(data.sections);
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
  const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(t.sections);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 3500);
  };

  const save = async (activate: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const p = await api.savePrompt(t.id, text, note, activate);
      setNote("");
      show(await api.template(t.id), p.id);
      flash(activate ? `Saved as version ${p.version} and put in use.` : `Saved as version ${p.version}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const activateVersion = async (promptId: number) => {
    setError(null);
    try {
      show(await api.setActivePrompt(t.id, promptId), promptId);
      flash("This version is now in use.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const saveSections = async () => {
    setError(null);
    try {
      show(await api.updateTemplate(t.id, { sections }), selectedId);
      flash("Note headings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleActive = async () => {
    try {
      show(await api.updateTemplate(t.id, { is_active: !t.is_active }), selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4" data-testid="template-page">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Templates
      </Link>

      <section className="card flex flex-wrap items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold text-ink" data-testid="template-name">
            {t.is_premium && <Star className="size-5 fill-amber-400 text-amber-500" aria-label="Premium" />}
            {t.name}
          </h2>
          <p className="mt-0.5 text-sm text-ink-2">{t.description || "No description"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold text-ink-2">{t.group_name || "Other"}</span>
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-semibold text-brand">
              {t.active_version ? `Version ${t.active_version} in use` : "No version in use"}
            </span>
            <span className={clsx("rounded-full px-2.5 py-0.5 font-semibold", t.is_active ? "bg-success-soft text-success" : "bg-surface-2 text-muted")}>
              {t.is_active ? "Offered to the clinical app" : "Hidden from the clinical app"}
            </span>
            {t.include_codes && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold text-ink-2">ICD-10 codes</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditingDetails(true)} className={buttonClass.secondary}>
            <Pencil className="size-4" /> Edit details
          </button>
          <button type="button" onClick={toggleActive} className={buttonClass.ghost}>
            {t.is_active ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {t.is_active ? "Hide" : "Show"}
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className={buttonClass.danger} aria-label="Delete template">
            <Trash2 className="size-4" />
          </button>
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {message && (
        <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-4 py-2.5 text-sm font-semibold text-success" role="status" data-testid="flash">
          <CheckCircle2 className="size-4" /> {message}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
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
                    p.id === selectedId ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2 hover:border-brand/40",
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
            <TextArea
              className="mt-3"
              rows={18}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Prompt text"
              data-testid="prompt-text"
              spellCheck={false}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={255}
                placeholder="What changed? (optional, e.g. shorter plan section)"
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

          <section className="card p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <ListOrdered className="size-5 text-brand" /> Note headings
            </h3>
            <p className="mb-3 mt-0.5 text-sm text-ink-2">The notes always have exactly these sections, in this order.</p>
            <SectionsEditor value={sections} onChange={setSections} />
            {sectionsChanged && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={saveSections} disabled={sections.filter((s) => s.trim()).length === 0} className={buttonClass.primary} data-testid="save-sections">
                  <Save className="size-4" /> Save headings
                </button>
                <button type="button" onClick={() => setSections(t.sections)} className={buttonClass.ghost}>
                  Cancel
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <TestPanel
            templateId={t.id}
            promptId={selectedId}
            promptText={text}
            sections={sections}
            includeCodes={t.include_codes}
            isDraft={changed}
          />
        </div>
      </div>

      {editingDetails && (
        <DetailsModal
          template={t}
          onClose={() => setEditingDetails(false)}
          onSaved={(d) => {
            show(d, selectedId);
            setEditingDetails(false);
            flash("Details saved.");
          }}
        />
      )}
      {confirmDelete && (
        <Modal title="Delete this template?" wide={false} onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-ink-2">
            “{t.name}” and all {t.prompts.length} prompt version(s) will be deleted. Saved results stay in the history. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className={buttonClass.ghost}>
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass.danger}
              data-testid="confirm-delete"
              onClick={async () => {
                await api.deleteTemplate(t.id);
                router.replace("/templates");
              }}
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DetailsModal({ template, onClose, onSaved }: { template: Template; onClose: () => void; onSaved: (t: Template) => void }) {
  const [name, setName] = useState(template.name);
  const [group, setGroup] = useState(template.group_name);
  const [description, setDescription] = useState(template.description);
  const [codes, setCodes] = useState(template.include_codes);
  const [premium, setPremium] = useState(template.is_premium);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onSaved(await api.updateTemplate(template.id, { name, group_name: group, description, include_codes: codes, is_premium: premium }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  return (
    <Modal title="Template details" wide={false} onClose={onClose} closeOnBackdrop={false}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        <Field label="Group" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={80} hint="e.g. Company templates, Nordic journal (COSMIC / TakeCare)" />
        <TextArea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        <div className="flex flex-wrap gap-5">
          <Toggle on={codes} onChange={setCodes} label="Ask for ICD-10 codes" />
          <Toggle on={premium} onChange={setPremium} label="Premium template" />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={buttonClass.ghost}>
            Cancel
          </button>
          <button type="submit" className={buttonClass.primary}>
            <Save className="size-4" /> Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
