"use client";

// "/" -> dashboard when signed in, otherwise the login page.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { admin, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(admin ? "/dashboard" : "/login");
  }, [admin, loading, router]);
  return (
    <div className="grid min-h-screen place-items-center text-brand">
      <Spinner className="size-8" />
    </div>
  );
}
