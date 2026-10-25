"use client";

// Prompts: the prompt behind every template, with the version in use. Open one to edit, version and test it.
import clsx from "clsx";
import { ChevronRight, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { ErrorBanner, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/auth";
import { versionSoft } from "@/lib/version-colors";
import type { TemplateSummary } from "@/lib/types";

export default function PromptsPage() {
  const [items, setItems] = useState<TemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");

  useEffect(() => {
    api.templates(true).then(setItems).catch((e) => setError(e.message));
  }, []);

  const groups = useMemo(() => [...new Set((items ?? []).map((t) => t.group_name || "Other"))], [items]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      (t) => (group === "all" || (t.group_name || "Other") === group) && (!q || [t.name, t.group_name].some((x) => x.toLowerCase().includes(q))),
    );
  }, [items, query, group]);

  return (
    <div data-testid="prompts-page">
      <PageHeader title="Prompts" />
      {error && <ErrorBanner message={error} />}
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <label className="flex h-10 min-w-0 flex-1 basis-64 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 focus-within:border-brand">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by template or group"
            aria-label="Search prompts"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink caret-ink outline-none placeholder:text-muted"
          />
        </label>
        <Select
          value={group}
          onChange={setGroup}
          options={[{ value: "all", label: "All groups" }, ...groups.map((g) => ({ value: g, label: g }))]}
          ariaLabel="Group"
          className="w-72"
          matchWidth
        />
        <span className="text-sm text-muted">{shown.length} prompts</span>
      </div>

      {!items ? (
        <div className="grid place-items-center py-16 text-brand">
          <Spinner className="size-7" />
        </div>
      ) : (
        <div className="card @container overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_minmax(0,14rem)_1rem] gap-3 border-b border-line bg-surface-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-muted @3xl:grid">
            <span>Prompt of template</span>
            <span>In use</span>
            <span>Versions</span>
            <span>Last change</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {shown.map((t) => {
              const latest = t.versions[0];
              return (
                <li key={t.id}>
                  <Link
                    href={`/prompts/${t.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 transition hover:bg-brand-soft/40 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_minmax(0,14rem)_1rem]"
                    data-testid="prompt-row"
                  >
                    <span className="flex min-w-0 basis-full items-center gap-2.5 @3xl:basis-auto">
                      <Sparkles className="size-4 shrink-0 text-brand" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{t.name}</span>
                        <span className="block truncate text-xs text-muted">{t.group_name || "Other"}</span>
                      </span>
                    </span>
                    <span>
                      <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", t.active_version ? versionSoft(t.active_version) : "bg-danger-soft text-danger")}>
                        {t.active_version ? `Version ${t.active_version}` : "None"}
                      </span>
                    </span>
                    <span className="text-sm text-ink-2">
                      {t.prompt_count}
                      <span className="@3xl:hidden"> version{t.prompt_count === 1 ? "" : "s"}</span>
                    </span>
                    <span className="min-w-0 truncate text-xs text-muted">
                      {latest ? `v${latest.version} · ${timeAgo(latest.created_at)}${latest.change_note ? ` · ${latest.change_note}` : ""}` : ""}
                    </span>
                    <ChevronRight className="hidden size-4 text-muted @3xl:block" />
                  </Link>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">No prompts match.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
