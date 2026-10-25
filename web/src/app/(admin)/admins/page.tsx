"use client";

// Admins: everyone who can sign in to this console. Add admins, switch them off/on, set a new password.
import { KeyRound, Lock, Mail, Plus, Power, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin-shell";
import { buttonClass, Field, PasswordField } from "@/components/fields";
import { Modal } from "@/components/modal";
import { ErrorBanner, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { timeAgo, useAuth } from "@/lib/auth";
import type { Admin } from "@/lib/types";

const RULE = "At least 10 characters with upper- and lower-case letters, a number and a symbol.";

export default function AdminsPage() {
  const { admin: me } = useAuth();
  const [items, setItems] = useState<Admin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<Admin | null>(null);

  const load = () => api.admins().then(setItems).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const toggle = async (a: Admin) => {
    setError(null);
    try {
      await api.updateAdmin(a.id, { is_active: !a.is_active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div data-testid="admins-page">
      <PageHeader
        title="Admins"
        subtitle="People who can sign in to this console. There is no public sign-up: admins add other admins."
        actions={
          <button type="button" onClick={() => setAdding(true)} className={buttonClass.primary} data-testid="add-admin">
            <Plus className="size-4" /> Add admin
          </button>
        }
      />
      {error && <ErrorBanner message={error} />}
      {!items ? (
        <div className="grid place-items-center py-16 text-brand">
          <Spinner className="size-7" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3" data-testid="admin-row">
                <span className={`grid size-10 place-items-center rounded-full font-semibold text-white ${a.is_active ? "bg-brand" : "bg-muted"}`}>
                  {(a.name.trim()[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">
                    {a.name} {a.id === me?.id && <span className="text-xs font-medium text-muted">(you)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {a.email} · {a.last_login_at ? `last sign-in ${timeAgo(a.last_login_at)}` : "never signed in"}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.is_active ? "bg-success-soft text-success" : "bg-surface-2 text-muted"}`}>
                  {a.is_active ? "Active" : "Switched off"}
                </span>
                <button type="button" onClick={() => setResetFor(a)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-2 hover:bg-surface-2">
                  <KeyRound className="size-4" /> New password
                </button>
                {a.id !== me?.id && (
                  <button type="button" onClick={() => toggle(a)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-2 hover:bg-surface-2">
                    <Power className="size-4" /> {a.is_active ? "Switch off" : "Switch on"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {adding && (
        <AddAdmin
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {resetFor && <ResetPassword admin={resetFor} onClose={() => setResetFor(null)} />}
    </div>
  );
}

function AddAdmin({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createAdmin({ name, email, password });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };
  return (
    <Modal title="Add an admin" wide={false} onClose={onClose} closeOnBackdrop={false} testId="add-admin-modal">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" icon={User} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <Field label="Email" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="First password" icon={Lock} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint={`${RULE} Share it privately; they can change it in Settings.`} />
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass.ghost}>
            Cancel
          </button>
          <button type="submit" disabled={busy || !name.trim() || !email.trim() || !password} className={buttonClass.primary}>
            {busy ? <Spinner /> : <Plus className="size-4" />} Add admin
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPassword({ admin, onClose }: { admin: Admin; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdmin(admin.id, { password });
      setMsg({ ok: true, text: `New password set for ${admin.name}. Share it with them privately.` });
      setPassword("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  };
  return (
    <Modal title={`New password for ${admin.name}`} wide={false} onClose={onClose} closeOnBackdrop={false}>
      <form onSubmit={submit} className="space-y-3">
        <PasswordField label="New password" icon={Lock} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint={RULE} />
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass.ghost}>
            Close
          </button>
          <button type="submit" disabled={!password} className={buttonClass.primary}>
            <KeyRound className="size-4" /> Set password
          </button>
        </div>
      </form>
    </Modal>
  );
}
