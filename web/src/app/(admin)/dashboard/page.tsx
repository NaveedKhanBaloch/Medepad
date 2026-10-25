"use client";

// Dashboard: numbers at a glance, the AI in use, templates per group, latest changes and results.
import { ArrowRight, Bot, FileStack, FlaskConical, History, Plus, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { buttonClass } from "@/components/fields";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo, useAuth } from "@/lib/auth";
import type { Dashboard, Generation } from "@/lib/types";

const AI_NAMES = { gemini: "Google Gemini", openai: "OpenAI", azure_openai: "Azure OpenAI", mock: "Offline sample notes" };

function Stat({ icon: Icon, label, value, sub, href }: { icon: React.ElementType; label: string; value: number | string; sub?: string; href: string }) {
  return (
    <Link href={href} className="card group flex items-center gap-4 p-5 transition hover:border-brand/40" data-testid={`stat-${label}`}>
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-2">{label}</span>
        <span className="block font-display text-2xl font-extrabold text-ink">{value}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
      <ArrowRight className="ms-auto size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}

export default function DashboardPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [recent, setRecent] = useState<Generation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
    api.generations(undefined, 6).then(setRecent).catch(() => {});
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data)
    return (
      <div className="grid place-items-center py-20 text-brand">
        <Spinner className="size-7" />
      </div>
    );
  const maxGroup = Math.max(1, ...data.groups.map((g) => g.count));

  return (
    <div className="space-y-5" data-testid="dashboard">
      <PageHeader
        title={`Welcome, ${admin?.name.split(" ")[0] ?? "admin"}`}
        subtitle="Manage the note templates and the prompts behind them, and test them on transcripts."
        actions={
          <>
            <Link href="/templates/new" className={buttonClass.secondary}>
              <Plus className="size-4" /> New template
            </Link>
            <Link href="/templates" className={buttonClass.primary}>
              <FlaskConical className="size-4" /> Test a prompt
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FileStack} label="Templates" value={data.templates} sub={`${data.active_templates} offered to the clinical app`} href="/templates" />
        <Stat icon={Sparkles} label="Prompt versions" value={data.prompts} sub="every save is kept" href="/templates" />
        <Stat icon={History} label="Results" value={data.generations_total} sub={`${data.generations_today} in the last 24 hours`} href="/results" />
        <Stat icon={Users} label="Admins" value={data.admins} href="/admins" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Bot className="size-5 text-brand" /> AI that writes the notes
          </h3>
          <p className="mt-3 font-semibold text-ink" data-testid="ai-provider">{AI_NAMES[data.ai.provider]}</p>
          <p className="text-sm text-ink-2">Model: {data.ai.model}</p>
          <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${data.ai.ready ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
            {data.ai.ready ? "Ready" : "Key missing in backend/.env"}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">The same rules as the clinical app are added to every prompt, so results match what doctors will get.</p>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h3 className="font-display text-lg font-bold text-ink">Templates per group</h3>
          <div className="mt-3 space-y-2.5">
            {data.groups.map((g) => (
              <div key={g.name} className="grid grid-cols-[minmax(0,14rem)_1fr_2rem] items-center gap-3 text-sm">
                <span className="truncate text-ink-2">{g.name}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-brand-gradient" style={{ width: `${(g.count / maxGroup) * 100}%` }} />
                </span>
                <span className="text-end font-semibold text-ink">{g.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="font-display text-lg font-bold text-ink">Recently changed templates</h3>
          <ul className="mt-2 divide-y divide-line">
            {data.recently_changed.map((t) => (
              <li key={t.id}>
                <Link href={`/templates/${t.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{t.name}</span>
                    <span className="block truncate text-xs text-muted">{t.group_name}</span>
                  </span>
                  {t.active_version && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">v{t.active_version} in use</span>}
                  <span className="w-20 text-end text-xs text-muted">{timeAgo(t.updated_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-ink">Latest results</h3>
            <Link href="/results" className="text-sm font-semibold text-brand hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No notes generated yet. Open a template, paste a transcript and press Generate.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {recent.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-2.5">
                  <span className={`size-2 shrink-0 rounded-full ${g.success ? "bg-success" : "bg-danger"}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{g.template_name ?? "Free prompt"}</span>
                    <span className="block truncate text-xs text-muted">
                      {g.prompt_version ? `Version ${g.prompt_version}` : "Unsaved draft"} · {g.created_by_name} · {(g.latency_ms / 1000).toFixed(1)} s
                    </span>
                  </span>
                  <span className="w-20 text-end text-xs text-muted">{timeAgo(g.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
