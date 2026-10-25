"use client";

// Sidebar + top bar around every signed-in page (same look as the Medepad clinical app).
import clsx from "clsx";
import { ChevronDown, FileStack, History, LayoutGrid, LogOut, Menu, Moon, Settings, Sun, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { applyTheme, useTheme } from "@/lib/prefs";
import { Logo } from "./logo";
import { Spinner } from "./ui";

const NAV = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "/templates", label: "Templates & prompts", icon: FileStack },
      { href: "/results", label: "Results", icon: History },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admins", label: "Admins", icon: Users },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, loading, offline, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [loading, admin, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!loading && !admin) {
    // signed out: on the way to the login page
    return (
      <div className="grid min-h-screen place-items-center text-brand">
        <Spinner className="size-8" />
      </div>
    );
  }
  const name = admin?.name ?? "";
  const initial = (name.trim()[0] || admin?.email[0] || "·").toUpperCase();

  return (
    <div className="app-backdrop flex min-h-screen">
      <aside
        className={clsx(
          "fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-line bg-surface transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-line px-6">
          <Logo subtitle="ADMIN CONSOLE" />
          <button className="lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <X className="size-5 text-muted" />
          </button>
        </div>
        <nav className="flex flex-col gap-5 px-3 py-4" aria-label="Main">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{group.label}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setNavOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "relative flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors",
                        active ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {active && <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-brand" aria-hidden />}
                      <Icon className="size-[18px] shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <p className="mt-auto px-6 pb-5 text-xs leading-relaxed text-muted">
          Prompts saved here are the templates the Medepad clinical app will use.
        </p>
      </aside>
      {navOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-8">
          <button className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu className="size-6 text-ink" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-[1.6rem] font-extrabold tracking-tight text-brand lg:text-[2rem]">
            Medepad <span className="text-accent">Admin</span>
          </h1>
          <button
            type="button"
            onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
            className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink transition hover:border-brand/50"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2.5 rounded-full py-1 pe-1.5 ps-3 transition hover:bg-surface-2"
            >
              <span className="hidden max-w-[12rem] truncate font-semibold text-ink sm:block">{name}</span>
              <span className="grid size-9 place-items-center rounded-full bg-brand text-[15px] font-semibold text-white ring-2 ring-surface shadow-sm">
                {initial}
              </span>
              <ChevronDown className={clsx("size-4 text-muted transition-transform", menuOpen && "rotate-180")} />
            </button>
            {menuOpen && (
              <div className="absolute end-0 z-30 mt-1.5 w-60 rounded-xl border border-line bg-surface p-1 shadow-xl" role="menu">
                <div className="mb-1 border-b border-line px-2.5 pb-2 pt-1.5">
                  <div className="truncate text-sm font-semibold text-ink">{name}</div>
                  <div className="truncate text-xs text-muted">{admin?.email}</div>
                </div>
                <Link href="/settings#password" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-surface-2" onClick={() => setMenuOpen(false)}>
                  <Settings className="size-4" /> Settings & password
                </Link>
                <button
                  onClick={() => {
                    logout();
                    router.replace("/login");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-danger hover:bg-danger-soft"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 pb-8 pt-5 sm:px-8">
          {/* The page is always rendered (Next.js checks this), but stays hidden until sign-in is confirmed. */}
          {loading && (
            <div className="grid place-items-center gap-3 py-20 text-brand">
              <Spinner className="size-8" />
              {offline && <p className="text-sm text-ink-2">Cannot reach the Medepad Admin server. Trying again…</p>}
            </div>
          )}
          <div hidden={loading}>{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Title row at the top of each page. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-extrabold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
