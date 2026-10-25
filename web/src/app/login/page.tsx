"use client";

// Admin sign-in: email + password only (no Google, no sign-up). New admins are added by an admin.
import { Lock, Mail, Moon, ShieldCheck, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { DotsBackground } from "@/components/dots-background";
import { buttonClass, Field, PasswordField } from "@/components/fields";
import { LogoMark } from "@/components/logo";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { applyTheme, useTheme } from "@/lib/prefs";

export default function LoginPage() {
  const { admin, loading, login } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // false until the page's scripts are running: before that the browser would send the form itself
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!loading && admin) router.replace("/dashboard");
  }, [admin, loading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password, remember);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      <DotsBackground />
      <header className="absolute end-0 top-0 z-20 px-4 py-4 sm:px-8 sm:py-5">
        <button
          type="button"
          onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
          className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink transition hover:border-brand/50"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px]">
          <div className="rounded-[28px] border border-line/80 bg-surface/85 px-6 py-7 shadow-[0_30px_80px_-30px_rgba(0,77,68,0.35)] backdrop-blur-xl sm:px-9">
            <div className="mb-5 flex flex-col items-center text-center">
              <LogoMark size={52} className="drop-shadow-[0_10px_20px_rgba(0,121,107,0.3)]" />
              <div className="mt-3 font-display text-[1.6rem] font-extrabold leading-tight tracking-tight text-ink">
                mede<span className="text-brand">pad</span> <span className="text-accent">Admin</span>
              </div>
              <p className="mt-1 text-[15px] text-ink-2">Sign in to manage note templates and prompts</p>
            </div>

            {/* method="post": never put the email/password in the address bar, even before the scripts load */}
            <form onSubmit={submit} method="post" action="/login" className="space-y-4" noValidate>
              <Field
                label="Email"
                icon={Mail}
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <PasswordField
                label="Password"
                icon={Lock}
                name="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--brand)]" />
                Keep me signed in on this computer
              </label>
              {error && (
                <p className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger" role="alert" data-testid="login-error">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy || !ready} className={`${buttonClass.primary} h-11 w-full text-[15px]`} data-testid="sign-in">
                {busy && <Spinner />} Sign in
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-muted">Forgot your password? Ask the super admin to set a new one.</p>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 text-brand" /> Admins only · the account locks after 5 wrong passwords
          </p>
        </div>
      </main>
      <footer className="relative z-10 px-5 pb-5 text-center text-xs text-muted">© Medepad · Admin console</footer>
    </div>
  );
}
