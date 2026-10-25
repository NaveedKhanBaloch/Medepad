"use client";

// Settings: which prompt version each template uses (compact table), and your password.
import { KeyRound, Save, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { buttonClass, PasswordField } from "@/components/fields";
import { useToast } from "@/components/toast";
import { ErrorBanner, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import type { TemplateSummary } from "@/lib/types";
import { versionDot } from "@/lib/version-colors";

const Dot = ({ version }: { version: number }) => <span className={`size-2 shrink-0 rounded-full ${versionDot(version)}`} aria-hidden />;

export default function SettingsPage() {
  const [items, setItems] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const toast = useToast();

  useEffect(() => {
    api.templates(true).then(setItems).catch((e) => setError(e.message));
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
      toast.show(`Version ${updated.active_version} is now in use for ${t.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4" data-testid="settings-page">
      <PageHeader title="Settings" />
      {error && <ErrorBanner message={error} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card @container" data-testid="settings-versions">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink">
              <SlidersHorizontal className="size-4 text-brand" /> Prompt in use for each template
            </h3>
            <label className="flex h-8 w-56 items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 focus-within:border-brand">
              <Search className="size-3.5 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="min-w-0 flex-1 bg-transparent text-xs text-ink caret-ink outline-none placeholder:text-muted"
              />
            </label>
          </div>
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,13rem)_9.5rem] gap-3 bg-surface-2 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted @2xl:grid">
            <span>Template</span>
            <span>Group</span>
            <span>Version in use</span>
          </div>
          {!items ? (
            <div className="grid place-items-center py-10 text-brand">
              <Spinner />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,13rem)_9.5rem]"
                  data-testid="settings-row"
                >
                  <Link href={`/prompts/${t.id}`} className="min-w-0 basis-full truncate text-sm font-semibold text-ink hover:text-brand @2xl:basis-auto">
                    {t.name}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted">{t.group_name}</span>
                  <Select
                    size="sm"
                    value={t.active_prompt_id ? String(t.active_prompt_id) : null}
                    onChange={(v) => choose(t, Number(v))}
                    options={t.versions.map((v) => ({
                      value: String(v.id),
                      label: `Version ${v.version}`,
                      icon: <Dot version={v.version} />,
                      suffix: v.change_note ? `${v.change_note} · ${timeAgo(v.created_at)}` : timeAgo(v.created_at),
                    }))}
                    placeholder="No version"
                    ariaLabel={`Prompt version for ${t.name}`}
                    className="w-[9.5rem]"
                  />
                </li>
              ))}
              {shown.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No templates match.</li>}
            </ul>
          )}
        </section>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <ChangePassword />
        </div>
      </div>
      {toast.toast}
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
    <section className="card p-4" id="password">
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink">
        <KeyRound className="size-4 text-brand" /> Change your password
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
        {msg && (
          <p className={`text-sm font-semibold ${msg.ok ? "text-success" : "text-danger"}`} role="status">
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy || !current || !next} className={`${buttonClass.primary} w-full`}>
          {busy ? <Spinner /> : <Save className="size-4" />} Change password
        </button>
      </form>
    </section>
  );
}
