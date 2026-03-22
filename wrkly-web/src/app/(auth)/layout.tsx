"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Kanban } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      router.replace("/workspaces");
    }
  }, [mounted, token, router]);

  if (!mounted || token) {
    return null;
  }

  return (
    <div className="auth-bg relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Kanban className="h-4.5 w-4.5 text-primary" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          wrkly
        </span>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm">
        {children}
      </div>

      {/* Footer */}
      <p className="mt-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wrkly · AI Task Orchestration
      </p>
    </div>
  );
}
