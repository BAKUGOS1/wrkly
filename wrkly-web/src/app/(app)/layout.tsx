"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClientProvider } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { AiCommandBar } from "@/components/ai/ai-command-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/login");
    }
  }, [mounted, token, router]);

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!token) {
    return null; // Redirecting…
  }

  return (
    <QueryClientProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
      <AiCommandBar />
    </QueryClientProvider>
  );
}
