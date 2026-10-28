"use client";

// One template: its details (name, group, description, options), shown/hidden, its note headings, and a summary of
// its prompt versions. The prompt itself is edited and tested on the Prompts page.
import clsx from "clsx";
import { ArrowLeft, Check, Eye, EyeOff, ListOrdered, Pencil, Save, Sparkles, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass, Field, TextArea, Toggle } from "@/components/fields";
import { Modal } from "@/components/modal";
import { SectionsEditor } from "@/components/sections-editor";
import { useToast } from "@/components/toast";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import { versionSoft, versionSolid } from "@/lib/version-colors";
import type { Template } from "@/lib/types";

export default function TemplatePage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const [t, setT] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<string[]>([]);
  const [editingDetails, setEditingDetails] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  const show = (data: Template) => {
    setT(data);
    setSections(data.sections);
  };

  useEffect(() => {
    api
      .template(id)
      .then((data) => {
        setT(data);
        setSections(data.sections);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error && !t) return <ErrorBanner message={error} />;
  if (!t)
    return (
      <div className="grid place-items-center py-20 text-brand">
        <Spinner className="size-7" />
      </div>
    );

  const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(t.sections);

  const saveSections = async (list: string[] = sections, message = "Note headings saved") => {
    setError(null);
    try {
      show(await api.updateTemplate(t.id, { sections: list }));
      toast.show(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSections(t.sections);
    }
  };

  /** Adding, removing or moving a heading saves at once; renaming one waits for "Save headings". */
  const changeSections = (next: string[]) => {
    setSections(next);
    const sameItems = [...next].sort().join("\n") === [...sections].sort().join("\n");
    if (next.length > sections.length) void saveSections(next, "Heading added");
    else if (next.length < sections.length) void saveSections(next, "Heading removed");
    else if (sameItems && next.join("\n") !== sections.join("\n")) void saveSections(next, "Order saved");
  };

  const chooseVersion = async (promptId: number, version: number) => {
    if (promptId === t.active_prompt_id) return;
    setError(null);
    try {
      show(await api.setActivePrompt(t.id, promptId));
      toast.show(`Version ${version} is now in use`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleActive = async () => {
    try {
      const updated = await api.updateTemplate(t.id, { is_active: !t.is_active });
      show(updated);
      toast.show(updated.is_active ? "Template shown to the clinical app" : "Template hidden from the clinical app");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4" data-testid="template-details-page">
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
            <span className={clsx("rounded-full px-2.5 py-0.5 font-semibold", t.active_version ? versionSoft(t.active_version) : "bg-danger-soft text-danger")}>
              {t.active_version ? `Prompt version ${t.active_version} in use` : "No prompt in use"}
            </span>
            <span className={clsx("rounded-full px-2.5 py-0.5 font-semibold", t.is_active ? "bg-success-soft text-success" : "bg-surface-2 text-muted")}>
              {t.is_active ? "Offered to the clinical app" : "Hidden from the clinical app"}
            </span>
            {t.include_codes && (
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-semibold text-ink-2" title="The notes include ICD-10 diagnosis codes, e.g. J06.9">
                Adds ICD-10 diagnosis codes
              </span>
            )}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <ListOrdered className="size-5 text-brand" /> Note headings
          </h3>
          <div className="mt-3" />
          <SectionsEditor value={sections} onChange={changeSections} />
          {sectionsChanged && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => saveSections()} disabled={sections.filter((s) => s.trim()).length === 0} className={buttonClass.primary} data-testid="save-sections">
                <Save className="size-4" /> Save headings
              </button>
              <button type="button" onClick={() => setSections(t.sections)} className={buttonClass.ghost}>
                Cancel
              </button>
            </div>
          )}
        </section>

        <section className="card flex flex-col p-5" data-testid="template-prompt-summary">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Sparkles className="size-5 text-brand" /> Prompt
            </h3>
            <Link href={`/prompts/${t.id}`} className={buttonClass.primary} data-testid="open-prompt">
              <Pencil className="size-4" /> Edit & test prompt
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {t.prompts.map((p) => {
              const inUse = p.id === t.active_prompt_id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => chooseVersion(p.id, p.version)}
                    disabled={inUse}
                    title={inUse ? "This version is in use" : `Click to use version ${p.version}`}
                    data-testid="version-row"
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-start text-sm transition",
                      inUse ? "cursor-default" : "hover:bg-brand-soft",
                    )}
                  >
                    <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", inUse ? versionSolid(p.version) : versionSoft(p.version))}>
                      v{p.version}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-2">{p.change_note || "No change note"}</span>
                    <span className="text-xs text-muted">
                      {p.created_by_name ?? "starter"} · {timeAgo(p.created_at)}
                    </span>
                    {inUse ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                        <Check className="size-3.5" /> in use
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-brand">Use</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {editingDetails && (
        <DetailsModal
          template={t}
          onClose={() => setEditingDetails(false)}
          onSaved={(d) => {
            show(d);
            setEditingDetails(false);
            toast.show("Details saved");
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
      {toast.toast}
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
