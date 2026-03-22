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
      <div className="mb-8 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wrkly-primary-lockup-dark.svg" alt="wrkly" className="h-[45px] w-auto" />
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
