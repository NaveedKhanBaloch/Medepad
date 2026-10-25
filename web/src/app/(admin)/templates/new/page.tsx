"use client";

// New template: name, group, description, note headings, options and its first prompt (version 1, in use).
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { buttonClass, Field, TextArea, Toggle } from "@/components/fields";
import { SectionsEditor } from "@/components/sections-editor";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { DEFAULT_SECTIONS, STARTER_PROMPT } from "@/lib/samples";

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<string[]>(DEFAULT_SECTIONS);
  const [codes, setCodes] = useState(true);
  const [premium, setPremium] = useState(false);
  const [prompt, setPrompt] = useState(STARTER_PROMPT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.templates().then((items) => setGroups([...new Set(items.map((t) => t.group_name).filter(Boolean))])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const t = await api.createTemplate({
        name,
        group_name: group,
        description,
        sections: sections.filter((s) => s.trim()),
        include_codes: codes,
        is_premium: premium,
        prompt,
      });
      router.replace(`/templates/${t.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Templates
      </Link>
      <PageHeader title="New template" subtitle="It is saved with its prompt as version 1 and put in use straight away." />
      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" data-testid="new-template-form">
        <section className="card space-y-4 p-5">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} placeholder="e.g. Cardiology follow-up" data-testid="name-input" />
          <div>
            <Field label="Group" value={group} onChange={(e) => setGroup(e.target.value)} maxLength={80} placeholder="e.g. Company templates" list="groups" />
            <datalist id="groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <TextArea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line shown to doctors when they pick a template" maxLength={2000} />
          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">Note headings</p>
            <SectionsEditor value={sections} onChange={setSections} />
          </div>
          <div className="flex flex-wrap gap-5">
            <Toggle on={codes} onChange={setCodes} label="Ask for ICD-10 codes" />
            <Toggle on={premium} onChange={setPremium} label="Premium template" />
          </div>
        </section>
        <section className="card flex flex-col p-5">
          <TextArea
            label="Prompt (version 1)"
            hint="The house-style rules are already filled in; describe what this template is for at the end."
            rows={20}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            spellCheck={false}
            data-testid="new-prompt"
          />
          {error && (
            <div className="mt-3">
              <ErrorBanner message={error} />
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Link href="/templates" className={buttonClass.ghost}>
              Cancel
            </Link>
            <button type="submit" disabled={busy || !name.trim() || !prompt.trim()} className={buttonClass.primary} data-testid="create-template">
              {busy ? <Spinner /> : <Plus className="size-4" />} Create template
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
