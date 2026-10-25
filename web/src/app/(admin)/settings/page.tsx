"use client";

// Settings: which prompt version each template uses, which AI writes the notes, and your password.
import { Bot, KeyRound, Save, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { buttonClass, PasswordField } from "@/components/fields";
import { ErrorBanner, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import type { AiInfo, TemplateSummary } from "@/lib/types";

const AI_NAMES = { gemini: "Google Gemini", openai: "OpenAI", azure_openai: "Azure OpenAI", mock: "Offline sample notes" };

export default function SettingsPage() {
  const [items, setItems] = useState<TemplateSummary[] | null>(null);
  const [ai, setAi] = useState<AiInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<number | null>(null);

  useEffect(() => {
    api.templates(true).then(setItems).catch((e) => setError(e.message));
    api.aiSettings().then(setAi).catch(() => {});
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter((t) => !q || t.name.toLowerCase().includes(q) || t.group_name.toLowerCase().includes(q));
  }, [items, query]);

  const choose = async (t: TemplateSummary, promptId: number) => {
    setError(null);
    try {
      const updated = await api.setActivePrompt(t.id, promptId);
      setItems((list) => (list ?? []).map((x) => (x.id === t.id ? { ...x, active_prompt_id: updated.active_prompt_id, active_version: updated.active_version } : x)));
      setSaved(t.id);
      setTimeout(() => setSaved((s) => (s === t.id ? null : s)), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4" data-testid="settings-page">
      <PageHeader title="Settings" subtitle="Choose the prompt each template uses, see which AI writes the notes, and change your password." />
      {error && <ErrorBanner message={error} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <SlidersHorizontal className="size-5 text-brand" /> Prompt in use for each template
            </h3>
            <label className="flex h-9 w-64 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-brand">
              <Search className="size-4 text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search templates" className="min-w-0 flex-1 bg-transparent text-sm text-ink caret-ink outline-none" />
            </label>
          </div>
          <p className="mt-1 text-sm text-ink-2">The clinical app will use the chosen version. Older versions stay available to switch back to.</p>
          {!items ? (
            <div className="grid place-items-center py-10 text-brand">
              <Spinner />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {shown.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5" data-testid="settings-row">
                  <span className="min-w-0 flex-1">
                    <Link href={`/templates/${t.id}`} className="block truncate font-semibold text-ink hover:text-brand">
                      {t.name}
                    </Link>
                    <span className="block truncate text-xs text-muted">{t.group_name}</span>
                  </span>
                  {saved === t.id && <span className="text-xs font-semibold text-success">Saved</span>}
                  <Select
                    value={t.active_prompt_id ? String(t.active_prompt_id) : null}
                    onChange={(v) => choose(t, Number(v))}
                    options={t.versions.map((v) => ({
                      value: String(v.id),
                      label: `Version ${v.version}`,
                      suffix: v.change_note ? `${v.change_note} · ${timeAgo(v.created_at)}` : timeAgo(v.created_at),
                    }))}
                    placeholder="No version"
                    ariaLabel={`Prompt version for ${t.name}`}
                    className="w-44"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Bot className="size-5 text-brand" /> AI that writes the notes
            </h3>
            {ai ? (
              <>
                <p className="mt-3 font-semibold text-ink">{AI_NAMES[ai.provider]}</p>
                <p className="text-sm text-ink-2">Model: {ai.model}</p>
                <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ai.ready ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                  {ai.ready ? "Ready" : "Key missing"}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Set in <code className="font-mono">backend/.env</code>: LLM_PROVIDER = gemini, openai or azure_openai, with its key.
                </p>
              </>
            ) : (
              <Spinner />
            )}
          </section>
          <ChangePassword />
        </div>
      </div>
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card p-5" id="password">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <KeyRound className="size-5 text-brand" /> Change your password
      </h3>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          hint="At least 10 characters with upper- and lower-case letters, a number and a symbol."
        />
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-success" : "text-danger"}`} role="status">{msg.text}</p>}
        <button type="submit" disabled={busy || !current || !next} className={`${buttonClass.primary} w-full`}>
          {busy ? <Spinner /> : <Save className="size-4" />} Change password
        </button>
      </form>
    </section>
  );
}
