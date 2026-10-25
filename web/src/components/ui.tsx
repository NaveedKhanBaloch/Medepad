"use client";

import clsx from "clsx";
import { Check, ChevronDown, Lock, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function IconBadge({ icon: Icon, className }: { icon: React.ElementType; className?: string }) {
  return (
    <span className={clsx("grid size-10 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-sm", className)}>
      <Icon className="size-5" />
    </span>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <IconBadge icon={icon} className="size-9" />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "primary",
  className,
  children,
  hint,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; hint?: string }) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary" && "bg-brand-gradient text-white shadow-sm hover:brightness-110",
        variant === "secondary" && "border border-line bg-surface text-ink hover:bg-surface-2",
        variant === "ghost" && "text-brand hover:bg-brand-soft",
        variant === "danger" && "border border-danger/30 bg-danger-soft text-danger hover:brightness-95",
        className,
      )}
    >
      {children}
      {hint && (
        <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-80">{hint}</kbd>
      )}
    </button>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** small tag shown at the end of the option, e.g. "Premium" */
  badge?: React.ReactNode;
  /** one-line description shown when hovering the option */
  hint?: string;
  locked?: boolean;
  suffix?: string;
  /** options with the same group are listed under that heading */
  group?: string;
}

/** Listbox that shows locked (premium) options greyed out with a lock, like the prototype. */
export function Select({
  value,
  options,
  onChange,
  placeholder = "Select…",
  className,
  ariaLabel,
  disabled,
  searchPlaceholder,
  matchWidth,
  dropUp,
  size = "md",
}: {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** shows a search box at the top of the list */
  searchPlaceholder?: string;
  /** the list opens exactly below the button, with the same width */
  matchWidth?: boolean;
  /** the list opens above the button (for dropdowns near the bottom of the screen) */
  dropUp?: boolean;
  /** "sm": compact button and list, for dense tables */
  size?: "md" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const shown = q
    ? options.filter((o) => [o.label, o.hint, o.group, o.suffix].some((x) => x?.toLowerCase().includes(q)))
    : options;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setQuery("");
          setOpen((o) => !o);
        }}
        className={clsx(
          "flex w-full items-center justify-between gap-2 border border-line bg-surface-2 text-start text-ink hover:border-brand/40 disabled:cursor-default disabled:hover:border-line",
          size === "sm" ? "h-8 rounded-lg px-2.5 text-xs font-semibold" : "rounded-xl px-3.5 py-2.5 text-sm",
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate" title={selected?.label}>
          {selected?.icon}
          {selected?.label ?? <span className="text-muted">{placeholder}</span>}
        </span>
        <ChevronDown className={clsx("size-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={clsx(
            "absolute z-30 overflow-auto rounded-xl border border-line bg-surface p-1.5 shadow-xl",
            dropUp ? "bottom-full mb-2" : "mt-2",
            matchWidth ? "inset-x-0 w-full" : "end-0 min-w-full sm:w-max sm:max-w-md",
            searchPlaceholder ? "max-h-[26rem]" : "max-h-80",
            searchPlaceholder && !matchWidth && "sm:min-w-[24rem]",
          )}
        >
          {searchPlaceholder && (
            <li className="sticky -top-1.5 z-10 -mx-1.5 -mt-1.5 mb-1 border-b border-line bg-surface p-2">
              <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 focus-within:border-brand">
                <Search className="size-4 shrink-0 text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink caret-ink outline-none placeholder:text-muted"
                />
              </label>
            </li>
          )}
          {shown.length === 0 && <li className="px-3 py-2 text-sm text-muted">—</li>}
          {shown.map((o, i) => (
            <li key={o.value}>
              {o.group && o.group !== shown[i - 1]?.group && (
                <p className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-brand" role="presentation">
                  {o.group}
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                title={o.hint}
                aria-disabled={o.locked}
                disabled={o.locked}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-lg text-start",
                  size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
                  o.locked ? "cursor-not-allowed text-muted" : "text-ink hover:bg-brand-soft",
                )}
              >
                {o.locked && <Lock className="size-3.5 shrink-0 text-warning" />}
                {o.icon}
                <span className="flex-1">
                  {o.label}
                  {o.suffix && <span className="text-muted"> · {o.suffix}</span>}
                </span>
                {o.badge}
                {o.value === value && <Check className="size-4 shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Rolling sound history as thin lines. Coral while recording, short grey lines when idle. */
export function Waveform({ levels, active, className }: { levels: number[]; active: boolean; className?: string }) {
  return (
    <div className={clsx("flex h-12 items-center justify-between gap-[2px]", className)} aria-hidden>
      {levels.map((l, i) => (
        <span
          key={i}
          className={clsx("w-[2px] shrink-0 rounded-full", active ? "min-h-[3px] bg-accent" : "bg-muted/35")}
          style={{ height: active ? `${Math.min(100, l * 120).toFixed(1)}%` : "3px" }}
        />
      ))}
    </div>
  );
}

/** Resting shape (px) for the lines before a test: a soft wave, taller in the middle. */
const idleHeight = (i: number, n: number) => {
  const x = n > 1 ? i / (n - 1) : 0.5;
  const hump = Math.sin(Math.PI * x);
  return Math.round(3 + 9 * hump * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.42) * Math.cos(i * 0.13))));
};

/** Equaliser-style bars that bloom from the centre with your voice (values 0..1).
 *  Draws only as many 2px lines as fit the width, so it always stays inside its box. */
export function BloomBars({ values, active, className }: { values: number[]; active: boolean; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(values.length);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setFit(Math.max(8, Math.floor((entry.contentRect.width + 2) / 4))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = Math.min(values.length, fit);
  const shown = n === values.length ? values : Array.from({ length: n }, (_, i) => values[Math.floor(((i + 0.5) * values.length) / n)]);
  return (
    <div
      ref={box}
      className={clsx("flex min-w-0 items-center justify-between gap-[2px] overflow-hidden", className ?? "h-full")}
      aria-hidden
      data-testid="bloom-bars"
    >
      {shown.map((v, i) => (
        <span
          key={i}
          className={clsx(
            "w-[2px] shrink-0 rounded-full",
            active ? "min-h-1 bg-linear-to-b from-[#FF9585] via-[#FF6F5E] to-[#FF9585]" : "bg-[#E8715F]",
          )}
          style={{
            // No CSS transition here: heights change ~30x a second and are already smoothed in useMicLevels.
            height: active ? `${Math.min(100, v * 100).toFixed(1)}%` : `${idleHeight(i, shown.length)}px`,
            opacity: active ? 0.85 + Math.min(1, v) * 0.15 : 0.85,
          }}
        />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx("inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{message}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-28 place-items-center text-sm text-muted">{children}</div>;
}
