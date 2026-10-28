"use client";

// Inputs in the Medepad style (same look as the clinical app's login).
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

export function Field({
  label,
  icon: Icon,
  error,
  trailing,
  hint,
  className,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ElementType;
  error?: string | null;
  trailing?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div
        className={clsx(
          "group flex items-center gap-2.5 rounded-xl border bg-surface px-3.5 transition focus-within:ring-4",
          error
            ? "border-danger/60 focus-within:border-danger focus-within:ring-danger/10"
            : "border-line hover:border-brand/40 focus-within:border-brand focus-within:ring-brand/12",
        )}
      >
        {Icon && <Icon className={clsx("size-[18px] shrink-0 transition", error ? "text-danger" : "text-muted group-focus-within:text-brand")} />}
        <input
          id={id}
          aria-invalid={!!error}
          className="h-11 w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70"
          {...input}
        />
        {trailing}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<React.ComponentProps<typeof Field>, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const detect = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);
  return (
    <Field
      {...props}
      type={visible ? "text" : "password"}
      onKeyDown={detect}
      onKeyUp={detect}
      hint={caps ? <span className="font-medium text-warning">Caps Lock is on</span> : props.hint}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="-me-1 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      }
    />
  );
}

/** Plain labelled text area / input used in the editors. */
export function TextArea({
  label,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      <textarea
        id={id}
        {...props}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-[14px] leading-relaxed text-ink caret-ink outline-none transition placeholder:text-muted/70 hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/12"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({ on, onChange, label, testId }: { on: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        data-testid={testId}
        onClick={() => onChange(!on)}
        className={clsx("relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors", on ? "bg-brand" : "bg-line")}
      >
        <span className={clsx("inline-block size-4 rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-1")} />
      </button>
      {label}
    </label>
  );
}

export const buttonClass = {
  primary:
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand/40 bg-surface px-4 text-sm font-semibold text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-2 disabled:opacity-60",
  danger:
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-surface px-4 text-sm font-semibold text-danger transition hover:bg-danger-soft disabled:opacity-60",
};
