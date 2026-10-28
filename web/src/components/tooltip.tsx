"use client";

// Small hover hint: a one-line, dark bubble shown when the pointer rests on (or keyboard focuses) the element.
import clsx from "clsx";

export function Tip({ text, side = "right", children, className }: { text: string; side?: "right" | "bottom"; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={clsx(
          "pointer-events-none invisible absolute z-50 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-surface opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:visible group-hover/tip:opacity-100 group-hover/tip:delay-200",
          side === "right" ? "start-full top-1/2 ms-2 -translate-y-1/2" : "start-1/2 top-full mt-2 -translate-x-1/2 rtl:translate-x-1/2",
        )}
      >
        {text}
      </span>
    </span>
  );
}
