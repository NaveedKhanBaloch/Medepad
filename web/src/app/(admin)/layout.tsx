import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";

// Signed-in pages depend on the browser session (token in the browser), so they cannot render from a
// prerendered static shell. Same setup as the clinical app: opt out of instant-navigation validation.
export const instant = false;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
