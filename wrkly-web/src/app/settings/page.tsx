"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Lock, Bell, Upload, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ── Notification toggle types ─────────────────────────────────────────────────

interface NotifSettings {
  emailGlobal: boolean;
  mentions: boolean;
  dueReminders: boolean;
  assignments: boolean;
  automations: boolean;
}

const DEFAULT_NOTIF: NotifSettings = {
  emailGlobal: true,
  mentions: true,
  dueReminders: true,
  assignments: true,
  automations: false,
};

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, setAuth } = useAuthStore();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatarUrl ?? null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "" },
  });

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch<{ url: string }>("/api/upload", {
        method: "POST",
        body: formData,
      });
      setAvatarUrl(res.url);
      toast({ title: "Avatar updated" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileValues) => {
    try {
      const res = await apiFetch<{ user: typeof user }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name: data.name, avatarUrl }),
      });
      if (res.user && useAuthStore.getState().token) {
        setAuth(
          res.user as NonNullable<typeof user>,
          useAuthStore.getState().token!,
        );
      }
      toast({ title: "Profile saved!" });
    } catch (err) {
      toast({
        title: "Failed to save profile",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 max-w-lg">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="h-20 w-20 ring-2 ring-border">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className="text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Profile picture</p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or GIF. Max 4 MB.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-1 gap-1.5"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-3.5 w-3.5" />
            Change photo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input placeholder="Your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email address</Label>
            <Input
              value={user?.email ?? ""}
              disabled
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed here. Contact support if needed.
            </p>
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save changes
          </Button>
        </form>
      </Form>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const toggle = (key: keyof NotifSettings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ notificationSettings: settings }),
      });
      toast({ title: "Notification preferences saved!" });
    } catch (err) {
      toast({
        title: "Failed to save preferences",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRow = (
    id: keyof NotifSettings,
    label: string,
    description: string,
    disabled = false,
  ) => (
    <div
      className={cn(
        "flex items-center justify-between py-3",
        disabled && "opacity-60",
      )}
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={settings[id]}
        onCheckedChange={() => !disabled && toggle(id)}
        disabled={disabled}
      />
    </div>
  );

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Email
        </h3>
        <div className="divide-y divide-border rounded-lg border bg-card px-4">
          {toggleRow(
            "emailGlobal",
            "Email notifications",
            "Receive all notifications via email",
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          In-App
        </h3>
        <div className="divide-y divide-border rounded-lg border bg-card px-4">
          {toggleRow(
            "mentions",
            "Mentions",
            "When someone @mentions you in a comment",
          )}
          {toggleRow(
            "dueReminders",
            "Due date reminders",
            "Before cards you own are due",
          )}
          {toggleRow(
            "assignments",
            "Assignments",
            "When a card is assigned to you",
          )}
          {toggleRow(
            "automations",
            "Automation activity",
            "When an automation runs on your cards",
          )}
          <div className="flex items-center justify-between py-3 opacity-50">
            <div>
              <p className="text-sm font-medium">All in-app notifications</p>
              <p className="text-xs text-muted-foreground">
                In-app notifications are always enabled
              </p>
            </div>
            <Switch checked disabled />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save preferences
      </Button>
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────────────────────────

function AccountTab() {
  const { toast } = useToast();
  const { logout } = useAuthStore();

  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordValues) => {
    try {
      await apiFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      toast({ title: "Password changed successfully!" });
      form.reset();
    } catch (err) {
      toast({
        title: "Failed to change password",
        description:
          err instanceof Error ? err.message : "Check your current password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-10 max-w-lg">
      {/* Change password */}
      <div>
        <h3 className="mb-4 text-sm font-semibold">Change password</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Min. 8 characters"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update password
            </Button>
          </form>
        </Form>
      </div>

      <Separator />

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-destructive">
              Danger zone
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently delete your account and all associated data. This
              action is irreversible.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="mt-4">
                  Delete my account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All your boards, cards, and data will be permanently
                    deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        await apiFetch("/api/auth/me", { method: "DELETE" });
                        logout();
                      } catch {
                        // Silently swallow — show nothing if endpoint not found
                      }
                    }}
                  >
                    Delete account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, notifications, and account security.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Lock className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <AccountTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
