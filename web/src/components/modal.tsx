"use client";

// Full-screen window over the page (Esc or the X closes it).
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

// Open windows, newest last: Esc only closes the top one (e.g. the dictation picker, not the editor under it).
const openStack: string[] = [];

export function Modal({
  title,
  actions,
  onClose,
  children,
  wide = true,
  testId,
  closeOnBackdrop = true,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  testId?: string;
  /** false for editors, so a stray click outside never throws away changes */
  closeOnBackdrop?: boolean;
}) {
  const id = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    openStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openStack[openStack.length - 1] === id) close.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      openStack.splice(openStack.indexOf(id), 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={closeOnBackdrop ? onClose : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        data-testid={testId}
        onMouseDown={(e) => e.stopPropagation()}
        className={clsx("card flex max-h-full w-full flex-col overflow-hidden shadow-2xl", wide ? "h-full max-w-6xl" : "max-w-2xl")}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 sm:px-6">
          <div className="min-w-0 flex-1 font-display text-lg font-bold text-ink">{title}</div>
          {actions}
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
