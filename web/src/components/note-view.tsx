"use client";

// Generated notes, shown the same way as in the clinical app (summary, sections, diagnostic codes).
import type { NoteResult } from "@/lib/types";

const RTL = ["ar", "ur", "fa"];

/** The notes as plain text (for Copy): summary, then each heading with its text, then the codes. */
export function noteText(note: NoteResult): string {
  const parts = [note.summary.replace(/^\[Mock output[^\]]*\]\s*/, "")];
  for (const s of note.sections) parts.push(`${s.title}\n${s.content}`);
  if (note.diagnostic_codes.length) parts.push(note.diagnostic_codes.map((d) => `${d.code} ${d.description}`).join("\n"));
  return parts.filter(Boolean).join("\n\n");
}

export function NoteView({ note, language }: { note: NoteResult; language?: string }) {
  return (
    <div data-testid="note-view" dir={language && RTL.includes(language) ? "rtl" : undefined} lang={language}>
      {note.provider === "mock" && (
        <p className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          Sample notes from the offline generator. Set LLM_PROVIDER=gemini in backend/.env for real notes.
        </p>
      )}
      {note.summary && <p className="text-[15px] leading-relaxed text-ink">{note.summary.replace(/^\[Mock output[^\]]*\]\s*/, "")}</p>}
      <div className="mt-3 space-y-3">
        {note.sections.map((s, i) => (
          <div key={`${i}-${s.title}`} className="rounded-xl border border-line bg-surface-2 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-brand">{s.title}</h4>
            <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{s.content}</p>
          </div>
        ))}
      </div>
      {note.diagnostic_codes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {note.diagnostic_codes.map((d) => (
            <span key={d.code} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2" title={d.verified ? "Code found in the reference list" : "Check this code"}>
              <span className="font-mono font-semibold text-ink">{d.code}</span> {d.description}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
