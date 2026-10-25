"use client";

// Test a prompt: paste a transcript, choose the notes language, press Generate and read the notes.
// The prompt sent is exactly what is in the editor (saved version or unsaved draft).
import { FlaskConical, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SAMPLE_TRANSCRIPT } from "@/lib/samples";
import type { Generation, Language } from "@/lib/types";
import { buttonClass, TextArea } from "./fields";
import { NoteView } from "./note-view";
import { ErrorBanner, Select, Spinner } from "./ui";

let languagesCache: Language[] | null = null;

export function useLanguages() {
  const [langs, setLangs] = useState<Language[]>(languagesCache ?? [{ code: "en", name: "English" }]);
  useEffect(() => {
    if (languagesCache) return;
    api
      .aiSettings()
      .then((s) => {
        languagesCache = s.languages;
        setLangs(s.languages);
      })
      .catch(() => {});
  }, []);
  return langs;
}

export function TestPanel({
  templateId,
  promptId,
  promptText,
  sections,
  includeCodes,
  isDraft,
  onGenerated,
}: {
  templateId: number;
  promptId: number | null;
  promptText: string;
  sections: string[];
  includeCodes: boolean;
  /** true when the editor text is not a saved version */
  isDraft: boolean;
  onGenerated?: (g: Generation) => void;
}) {
  const languages = useLanguages();
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Generation | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const g = await api.generate({
        template_id: templateId,
        prompt_id: isDraft ? null : promptId,
        prompt_text: promptText,
        sections,
        include_codes: includeCodes,
        transcript,
        language,
      });
      setResult(g);
      onGenerated?.(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card flex flex-col p-5" data-testid="test-panel">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <FlaskConical className="size-5 text-brand" /> Test the prompt
      </h3>
      <p className="mt-0.5 text-sm text-ink-2">
        Uses the text in the editor{isDraft ? " (unsaved draft)" : ""}. Use sample or role-play conversations only.
      </p>
      <TextArea
        className="mt-3"
        label="Transcript"
        rows={9}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder={"Paste a conversation, e.g.\nDoctor: What brings you in today?\nPatient: ..."}
        data-testid="transcript-input"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTranscript(SAMPLE_TRANSCRIPT)} className={buttonClass.ghost} data-testid="sample-transcript">
          <Wand2 className="size-4" /> Use a sample
        </button>
        <Select
          value={language}
          onChange={setLanguage}
          options={languages.map((l) => ({ value: l.code, label: l.name }))}
          ariaLabel="Notes language"
          className="ms-auto w-48"
        />
        <button
          type="button"
          onClick={generate}
          disabled={busy || !transcript.trim() || !promptText.trim()}
          className={buttonClass.primary}
          data-testid="generate"
        >
          {busy ? <Spinner /> : <Sparkles className="size-4" />} {busy ? "Generating…" : "Generate notes"}
        </button>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {result?.result && (
        <div className="mt-4 border-t border-line pt-4" data-testid="test-result">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-semibold text-brand">
              {result.prompt_version ? `Version ${result.prompt_version}` : "Unsaved draft"}
            </span>
            <span className="text-muted">
              {result.model} · {(result.latency_ms / 1000).toFixed(1)} s
            </span>
          </div>
          <NoteView note={result.result} language={result.language} />
        </div>
      )}
    </section>
  );
}
