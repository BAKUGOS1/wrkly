"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-[22px] font-semibold text-foreground mb-[12px]">
          Invalid reset link
        </h1>
        <p className="text-[14px] text-muted-foreground mb-[24px]">
          This password reset link is invalid or has expired. Please request a
          new one.
        </p>
        <Link href="/forgot-password">
          <Button className="h-[44px] w-full">Request new link</Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: ResetValues) => {
    setErrorMsg(null);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      setDone(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Failed to reset password. The link may have expired."
      );
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-[20px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-[28px] w-[28px] text-emerald-500" />
        </div>
        <h1 className="text-[22px] font-semibold text-foreground">
          Password reset!
        </h1>
        <p className="mt-[12px] text-[14px] text-muted-foreground">
          Your password has been changed. You can now sign in with your new
          password.
        </p>
        <div className="mt-[28px]">
          <Link href="/login">
            <Button className="h-[44px] w-full bg-[#4F6AF6] hover:bg-[#4560E0] text-white rounded-[10px]">
              Go to Sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <div className="mx-auto mb-[20px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-[28px] w-[28px] text-primary" />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="mt-[8px] text-[14px] text-muted-foreground">
          Choose a strong password with at least 8 characters.
        </p>
      </div>

      <div className="h-[28px]" />

      {errorMsg && (
        <div className="mb-[20px] rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]">
        <div className="space-y-[6px]">
          <Label className="text-[13px] font-medium text-foreground">
            New password
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              disabled={isSubmitting}
              className="h-[44px] pr-10"
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-[20px] w-[20px]" />
              ) : (
                <Eye className="h-[20px] w-[20px]" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-destructive">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-[6px]">
          <Label className="text-[13px] font-medium text-foreground">
            Confirm new password
          </Label>
          <Input
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting}
            className="h-[44px]"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="h-[8px]" />

        <Button
          type="submit"
          className="h-[46px] w-full bg-[#4F6AF6] hover:bg-[#4560E0] text-white text-[15px] font-medium rounded-[10px]"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reset password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-[32px] flex justify-center">
        <Logo width={140} height={40} />
      </div>
      <div className="w-full max-w-[420px] rounded-[16px] border border-border bg-card p-6 sm:p-10 shadow-sm">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
