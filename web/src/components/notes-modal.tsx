"use client";

// Generated notes in a full-screen window, with Copy and Download (Word) at the top right.
import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import type { Generation } from "@/lib/types";
import { Modal } from "./modal";
import { NoteView, noteText } from "./note-view";
import { ErrorBanner, Spinner } from "./ui";

export function NoteActions({ generation }: { generation: Generation }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!generation.result) return null;
  const note = generation.result;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(noteText(note));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy is not allowed in this browser.");
    }
  };
  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadGeneration(generation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={copy}
        data-testid="copy-notes"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand/40 bg-surface px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        data-testid="download-notes"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-gradient px-3.5 text-sm font-semibold text-white shadow-sm shadow-brand/25 hover:brightness-110 disabled:opacity-60"
      >
        {downloading ? <Spinner /> : <Download className="size-4" />} Download
      </button>
      {error && (
        <div className="basis-full">
          <ErrorBanner message={error} />
        </div>
      )}
    </>
  );
}

export function NotesModal({ generation, onClose }: { generation: Generation; onClose: () => void }) {
  if (!generation.result) return null;
  const title = `${generation.template_name ?? "Notes"} · ${generation.prompt_version ? `version ${generation.prompt_version}` : "unsaved draft"}`;
  return (
    <Modal title={title} onClose={onClose} testId="notes-fullscreen" actions={<NoteActions generation={generation} />}>
      <div className="mx-auto max-w-4xl">
        <NoteView note={generation.result} language={generation.language} />
      </div>
    </Modal>
  );
}
