"use client";

// Dashboard: quick actions, the numbers at a glance and the templates per group.
import { ArrowRight, FileStack, FlaskConical, History, Plus, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/fields";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Dashboard } from "@/lib/types";

/** Compact count card; teal (theme) outline when the pointer is on it. */
function Stat({ icon: Icon, label, value, sub, href }: { icon: React.ElementType; label: string; value: number | string; sub?: string; href: string }) {
  return (
    <Link href={href} className="card card-hover group flex min-w-0 items-center gap-3 px-4 py-3" data-testid={`stat-${label}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block whitespace-nowrap text-xs font-semibold text-ink-2">{label}</span>
        <span className="block font-display text-xl font-extrabold leading-tight text-ink">{value}</span>
        {sub && <span className="block whitespace-nowrap text-[11px] text-muted">{sub}</span>}
      </span>
      <ArrowRight className="ms-auto size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}

export default function DashboardPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data)
    return (
      <div className="grid place-items-center py-20 text-brand">
        <Spinner className="size-7" />
      </div>
    );
  const maxGroup = Math.max(1, ...data.groups.map((g) => g.count));
  const isSuper = admin?.role === "super_admin";

  return (
    <div className="space-y-4" data-testid="dashboard">
      <div className="flex flex-wrap justify-end gap-2" data-testid="dashboard-actions">
        <Link href="/templates/new" className={buttonClass.secondary}>
          <Plus className="size-4" /> New template
        </Link>
        <Link href="/prompts" className={buttonClass.primary}>
          <FlaskConical className="size-4" /> Test a prompt
        </Link>
      </div>

      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isSuper ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <Stat icon={FileStack} label="Templates" value={data.templates} href="/templates" />
        <Stat icon={Sparkles} label="Prompt versions" value={data.prompts} href="/prompts" />
        <Stat icon={History} label="Results" value={data.generations_total} sub={`${data.generations_today} in the last 24 hours`} href="/results" />
        {isSuper && <Stat icon={Users} label="Admins" value={data.admins} href="/admins" />}
      </div>

      <section className="card p-5">
        <h3 className="font-display text-lg font-bold text-ink">Templates per group</h3>
        <div className="mt-3 space-y-2.5">
          {data.groups.map((g) => (
            <div key={g.name} className="grid grid-cols-[minmax(0,16rem)_1fr_2rem] items-center gap-3 text-sm">
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
  );
}
