"use client";

// Ordered list of note headings (e.g. Current, Findings, Assessment, Plan, Referral): add, rename, move, remove.
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

export function SectionsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const add = () => {
    const name = draft.trim();
    if (!name) {
      setHint("Type a heading in the box first, then press Add.");
      input.current?.focus();
      return;
    }
    if (value.some((v) => v.toLowerCase() === name.toLowerCase())) {
      setHint(`“${name}” is already in the list.`);
      return;
    }
    setHint(null);
    onChange([...value, name]);
    setDraft("");
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div data-testid="sections-editor">
      <ol className="space-y-1.5">
        {value.map((s, i) => (
          <li key={`${i}-${s}`} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 py-1 pe-1 ps-3">
            <span className="w-5 text-xs font-bold text-muted">{i + 1}</span>
            <input
              value={s}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
              aria-label={`Heading ${i + 1}`}
              className="h-8 min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink caret-ink outline-none"
            />
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-30">
              <ArrowUp className="size-4" />
            </button>
            <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-30">
              <ArrowDown className="size-4" />
            </button>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove" className="grid size-7 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-2 flex gap-2">
        <input
          ref={input}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a heading, e.g. Safety-netting"
          aria-label="New heading"
          className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink caret-ink outline-none focus:border-brand"
        />
        <button type="button" onClick={add} data-testid="add-heading" className="inline-flex h-9 items-center gap-1 rounded-xl border border-brand/40 px-3 text-sm font-semibold text-brand hover:bg-brand-soft">
          <Plus className="size-4" /> Add
        </button>
      </div>
      {hint && (
        <p className="mt-1.5 text-xs font-medium text-warning" role="status" data-testid="heading-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
