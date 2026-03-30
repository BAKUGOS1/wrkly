"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ForgotValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotValues) => {
    setErrorMsg(null);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSent(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-[32px] flex justify-center">
        <Logo width={140} height={40} />
      </div>

      <div className="w-full max-w-[420px] rounded-[16px] border border-border bg-card p-6 sm:p-10 shadow-sm">
        {sent ? (
          /* Success state */
          <div className="text-center">
            <div className="mx-auto mb-[20px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-[28px] w-[28px] text-emerald-500" />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="mt-[12px] text-[14px] text-muted-foreground leading-relaxed">
              If an account exists for{" "}
              <span className="font-medium text-foreground">
                {getValues("email")}
              </span>
              , we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <div className="mt-[28px]">
              <Link href="/login">
                <Button variant="outline" className="h-[44px] w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign in
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Form state */
          <>
            <div className="text-center">
              <div className="mx-auto mb-[20px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-[28px] w-[28px] text-primary" />
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                Forgot your password?
              </h1>
              <p className="mt-[8px] text-[14px] text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
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
                <Label
                  htmlFor="email"
                  className="text-[13px] font-medium text-foreground"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="h-[44px]"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="h-[8px]" />

              <Button
                type="submit"
                className="h-[46px] w-full bg-[#4F6AF6] hover:bg-[#4560E0] text-white text-[15px] font-medium rounded-[10px]"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send reset link
              </Button>
            </form>

            <div className="my-[24px] h-[1px] w-full bg-border" />

            <p className="text-center text-[14px] text-muted-foreground">
              Remember your password?{" "}
              <Link
                href="/login"
                className="font-medium text-primary transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
