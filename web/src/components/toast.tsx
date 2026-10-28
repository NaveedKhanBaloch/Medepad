"use client";

// Short green confirmation at the top of the screen that disappears by itself after 2 seconds.
import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), 2000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const toast = message ? (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[70] flex justify-center px-4" role="status" aria-live="polite">
      <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-4 py-2.5 text-sm font-semibold text-success shadow-lg" data-testid="toast">
        <CheckCircle2 className="size-4" /> {message}
      </p>
    </div>
  ) : null;
  return { show, toast };
}
