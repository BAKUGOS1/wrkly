"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";
import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Dynamically import to avoid SSR issues with Google OAuth
const GoogleSignInButton = dynamic(
  () => import("@/components/auth/google-sign-in-button").then((m) => m.GoogleSignInButton),
  { ssr: false, loading: () => <Button variant="outline" className="h-[44px] w-full" disabled>Loading...</Button> }
);

// ── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mounted, setMounted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted && token) router.replace("/workspaces"); }, [mounted, token, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginValues) => {
    setErrorMsg(null);
    try {
      const resp = await apiFetch<{ token: string; user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setAuth(resp.user, resp.token);
      router.push("/workspaces");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message || "Invalid credentials" : "Something went wrong.");
    }
  };

  const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const googleUser = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      }).then((r) => r.json()) as { sub: string; email: string; name: string; picture: string; email_verified: boolean };

      const resp = await apiFetch<{ token: string; user: User }>("/api/auth/google", {
        method: "POST",
        body: JSON.stringify({ access_token: tokenResponse.access_token, googleUser }),
      });
      setAuth(resp.user, resp.token);
      router.push("/workspaces");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message || "Google sign-in failed" : "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!mounted || token) return null;

  const isAnyLoading = isSubmitting || googleLoading;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Brand */}
      <div className="mb-[32px] flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wrkly-primary-lockup-dark.svg" alt="Wrkly" className="hidden h-[36px] w-auto dark:block" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wrkly-primary-lockup-light.svg" alt="Wrkly" className="block h-[36px] w-auto dark:hidden" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[400px] rounded-[12px] border border-border bg-card p-[48px] shadow-sm">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-[8px] text-[14px] text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="h-[24px]" />

        {/* Error */}
        {errorMsg && (
          <div className="mb-[24px] flex items-start gap-[8px] rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
            <AlertCircle className="h-[16px] w-[16px] shrink-0 mt-[1px]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign In */}
        <div className="mb-[16px]">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={() => setErrorMsg("Google sign-in was cancelled or failed.")}
            loading={googleLoading}
            label="Continue with Google"
            disabled={isAnyLoading}
          />
        </div>

        {/* Divider */}
        <div className="relative mb-[16px]">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-[12px] text-[12px] text-muted-foreground">or continue with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">Email address</Label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" disabled={isAnyLoading} {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <Link href="#" className="text-[12px] text-muted-foreground transition-colors hover:text-primary" tabIndex={-1}>
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="" autoComplete="current-password" disabled={isAnyLoading} className="pr-10" {...register("password")} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="h-[8px]" />

          <Button type="submit" className="h-[44px] w-full text-[15px] font-medium" disabled={isAnyLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="my-[24px] h-[1px] w-full bg-border" />

        <p className="text-center text-[14px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary transition-colors hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
