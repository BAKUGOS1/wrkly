"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";
import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Schema ───────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mounted, setMounted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && token) {
      router.replace("/workspaces");
    }
  }, [mounted, token, router]);

  const {
    register: reg,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterValues) => {
    setErrorMsg(null);
    try {
      const resp = await apiFetch<{ token: string; user: User }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
          }),
        },
      );
      setAuth(resp.user, resp.token);
      router.push("/workspaces");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message || "Failed to create account");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
    }
  };

  if (!mounted || token) {
    return null;
  }

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
        {/* Header */}
        <div className="text-center">
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-[8px] text-[14px] text-muted-foreground">
            Start optimizing your workflows
          </p>
        </div>

        <div className="h-[24px]"></div>

        {/* Error */}
        {errorMsg && (
          <div className="mb-[24px] rounded-[10px] bg-error-container/20 p-3 text-sm text-error">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Full name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder=""
              autoComplete="name"
              disabled={isSubmitting}
              {...reg("name")}
            />
            {errors.name && (
              <p className="text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder=""
              autoComplete="email"
              disabled={isSubmitting}
              {...reg("email")}
            />
            {errors.email && (
              <p className="text-xs text-error">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder=""
                autoComplete="new-password"
                disabled={isSubmitting}
                className="pr-10"
                {...reg("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-error">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirm password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder=""
                autoComplete="new-password"
                disabled={isSubmitting}
                className="pr-10"
                {...reg("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-error">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="h-[8px]"></div>

          {/* Submit */}
          <Button
            type="submit"
            className="h-[44px] w-full text-[15px] font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-[44px] w-full text-[15px] font-medium mt-[12px]"
          >
            <svg className="mr-2 h-[18px] w-[18px]" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Sign up with Google
          </Button>
        </form>

        <div className="my-[24px] h-[1px] w-full bg-border" />

        {/* Footer */}
        <p className="text-center text-[14px] text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary transition-colors hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
