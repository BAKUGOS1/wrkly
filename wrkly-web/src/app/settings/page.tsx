'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from 'next-themes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
} from '@/components/ui/alert-dialog';
import { UserCircle, Palette, Bell, Shield, Upload, Computer, Moon, Sun, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// --- Schemas ---

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// --- Notification Types ---

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

export default function SettingsPage() {
  const { user, setAuth, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'account'>('profile');
  
  // Profile State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // Notifications State
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  const initials = (user?.name ?? 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  // Avatar Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<{ url: string }>('/api/upload', {
        method: 'POST',
        body: formData,
      });
      setAvatarUrl(res.url);
      toast({ title: 'Avatar updated' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // Profile Submit
  const onProfileSubmit = async (data: ProfileValues) => {
    try {
      const res = await apiFetch<{ user: typeof user }>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: data.name, avatarUrl }),
      });
      if (res.user && useAuthStore.getState().token) {
        setAuth(res.user as NonNullable<typeof user>, useAuthStore.getState().token!);
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      }
      toast({ title: 'Profile saved!' });
    } catch (err) {
      toast({
        title: 'Failed to save profile',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
  };

  // Password Submit
  const onPasswordSubmit = async (data: PasswordValues) => {
    try {
      await apiFetch('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      toast({ title: 'Password changed successfully!' });
      passwordForm.reset();
    } catch (err) {
      toast({
        title: 'Failed to change password',
        description: err instanceof Error ? err.message : 'Check your current password',
        variant: 'destructive',
      });
    }
  };

  // Notifications Submit
  const handleSaveNotifs = async () => {
    setIsSavingNotifs(true);
    try {
      await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ notificationSettings: notifSettings }),
      });
      toast({ title: 'Notification preferences saved!' });
    } catch (err) {
      toast({
        title: 'Failed to save preferences',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const toggleNotif = (key: keyof NotifSettings) => setNotifSettings((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-surface-container-low overflow-hidden">
      
      {/* Settings Navigation — horizontal tabs on mobile, sidebar on desktop */}
      {/* Mobile Tabs */}
      <div className="md:hidden border-b border-border bg-surface overflow-x-auto">
        <nav className="flex gap-0 px-2 py-2 min-w-max">
          {([
            { key: 'profile' as const, label: 'Profile', icon: UserCircle },
            { key: 'appearance' as const, label: 'Appearance', icon: Palette },
            { key: 'notifications' as const, label: 'Notifications', icon: Bell },
            { key: 'account' as const, label: 'Security', icon: Shield },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-[8px] h-[40px] px-[14px] rounded-[8px] text-[13px] font-medium transition-colors whitespace-nowrap",
                activeTab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-[16px] w-[16px]" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-[280px] shrink-0 border-r border-border bg-surface px-[24px] py-[32px] overflow-y-auto">
        <h2 className="text-[20px] font-bold text-foreground font-manrope mb-[24px]">User Settings</h2>
        
        <nav className="flex flex-col gap-[4px]">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex items-center gap-[12px] h-[40px] px-[12px] rounded-[8px] text-[14px] font-medium transition-colors",
              activeTab === 'profile' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-container hover:text-foreground"
            )}
          >
            <UserCircle className="h-[18px] w-[18px]" />
            Profile
          </button>
          
          <button
            onClick={() => setActiveTab('appearance')}
            className={cn(
              "flex items-center gap-[12px] h-[40px] px-[12px] rounded-[8px] text-[14px] font-medium transition-colors",
              activeTab === 'appearance' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-container hover:text-foreground"
            )}
          >
            <Palette className="h-[18px] w-[18px]" />
            Appearance
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "flex items-center gap-[12px] h-[40px] px-[12px] rounded-[8px] text-[14px] font-medium transition-colors",
              activeTab === 'notifications' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-container hover:text-foreground"
            )}
          >
            <Bell className="h-[18px] w-[18px]" />
            Notifications
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={cn(
              "flex items-center gap-[12px] h-[40px] px-[12px] rounded-[8px] text-[14px] font-medium transition-colors",
              activeTab === 'account' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-container hover:text-foreground"
            )}
          >
            <Shield className="h-[18px] w-[18px]" />
            Security & Account
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-[1] overflow-y-auto p-4 sm:p-6 md:p-[40px]">
        <div className="max-w-[720px]">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[24px] font-bold text-foreground font-manrope mb-[8px]">Profile details</h3>
              <p className="text-[14px] text-muted-foreground mb-[32px]">Manage your personal information and avatar.</p>
              
              <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm flex flex-col gap-[32px]">
                
                {/* Avatar Section */}
                <div className="flex items-center gap-[24px]">
                  <div className="relative">
                    <Avatar className="h-[80px] w-[80px] ring-1 ring-border shadow-sm">
                      <AvatarImage src={avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[24px] font-semibold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-[8px]">
                    <Button 
                      variant="outline" 
                      className="h-[36px] bg-surface-container-highest border-transparent hover:border-border text-[13px]"
                      onClick={() => fileRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="mr-[8px] h-[14px] w-[14px]" />
                      Upload new picture
                    </Button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <p className="text-[12px] text-muted-foreground">JPG, PNG or GIF. Max 4MB.</p>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex flex-col gap-[24px] max-w-[480px]">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-[8px]">
                          <FormLabel className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground pb-0">
                            Full Name
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your full name" 
                              {...field} 
                              className="bg-surface-container-highest border-transparent hover:border-border/50 focus:border-primary/50 text-[14px] h-[44px]"
                            />
                          </FormControl>
                          <FormMessage className="text-[12px]" />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-[8px]">
                      <label className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground block w-full text-left">
                        Email Address
                      </label>
                      <Input 
                        value={user?.email || ''}
                        disabled
                        className="bg-surface-container border-transparent opacity-60 text-[14px] h-[44px] cursor-not-allowed"
                      />
                      <p className="text-[12px] text-muted-foreground mt-[4px]">Email cannot be changed at this time.</p>
                    </div>

                    <div className="pt-[8px]">
                      <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                        {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save changes
                      </Button>
                    </div>
                  </form>
                </Form>

              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[24px] font-bold text-foreground font-manrope mb-[8px]">Appearance</h3>
              <p className="text-[14px] text-muted-foreground mb-[32px]">Customize how Wrkly looks on your device.</p>
              
              <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm">
                <label className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground mb-[16px] block">
                  Theme Preference
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
                  <button
                    onClick={() => setTheme('system')}
                    className={cn(
                      "flex flex-col items-center gap-[12px] p-[24px] rounded-[12px] border-2 transition-all",
                      theme === 'system' ? "border-primary bg-primary/5" : "border-transparent bg-surface-container-high hover:border-border"
                    )}
                  >
                    <Computer className="h-[32px] w-[32px] text-foreground" />
                    <span className="text-[14px] font-semibold text-foreground">System</span>
                  </button>

                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex flex-col items-center gap-[12px] p-[24px] rounded-[12px] border-2 transition-all",
                      theme === 'light' ? "border-primary bg-primary/5" : "border-transparent bg-surface-container-high hover:border-border"
                    )}
                  >
                    <Sun className="h-[32px] w-[32px] text-foreground" />
                    <span className="text-[14px] font-semibold text-foreground">Light</span>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex flex-col items-center gap-[12px] p-[24px] rounded-[12px] border-2 transition-all",
                      theme === 'dark' ? "border-primary bg-primary/5" : "border-transparent bg-surface-container-high hover:border-border"
                    )}
                  >
                    <Moon className="h-[32px] w-[32px] text-foreground" />
                    <span className="text-[14px] font-semibold text-foreground">Dark</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[24px] font-bold text-foreground font-manrope mb-[8px]">Notifications</h3>
              <p className="text-[14px] text-muted-foreground mb-[32px]">Choose what you want to be notified about.</p>
              
              <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm space-y-[24px]">
                
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground mb-[12px]">Email Notifications</h4>
                  <div className="rounded-[10px] bg-surface-container-high p-[16px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">Email digests</p>
                        <p className="text-[12px] text-muted-foreground">Receive daily summaries of account activity.</p>
                      </div>
                      <Switch checked={notifSettings.emailGlobal} onCheckedChange={() => toggleNotif('emailGlobal')} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground mb-[12px]">In-App Activity</h4>
                  <div className="rounded-[10px] bg-surface-container-high divide-y divide-border/50">
                    <div className="flex items-center justify-between p-[16px]">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">Mentions</p>
                        <p className="text-[12px] text-muted-foreground">When someone @mentions you.</p>
                      </div>
                      <Switch checked={notifSettings.mentions} onCheckedChange={() => toggleNotif('mentions')} />
                    </div>
                    <div className="flex items-center justify-between p-[16px]">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">Assignments</p>
                        <p className="text-[12px] text-muted-foreground">When a card is assigned to you.</p>
                      </div>
                      <Switch checked={notifSettings.assignments} onCheckedChange={() => toggleNotif('assignments')} />
                    </div>
                    <div className="flex items-center justify-between p-[16px]">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">Due reminders</p>
                        <p className="text-[12px] text-muted-foreground">Before cards you own are due.</p>
                      </div>
                      <Switch checked={notifSettings.dueReminders} onCheckedChange={() => toggleNotif('dueReminders')} />
                    </div>
                    <div className="flex items-center justify-between p-[16px]">
                      <div>
                        <p className="text-[14px] font-medium text-foreground">Automations</p>
                        <p className="text-[12px] text-muted-foreground">When an automation runs on your boards.</p>
                      </div>
                      <Switch checked={notifSettings.automations} onCheckedChange={() => toggleNotif('automations')} />
                    </div>
                  </div>
                </div>

                <div className="pt-[8px]">
                  <Button onClick={handleSaveNotifs} disabled={isSavingNotifs}>
                    {isSavingNotifs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save preferences
                  </Button>
                </div>

              </div>
            </div>
          )}

          {/* ACCOUNT & SECURITY TAB */}
          {activeTab === 'account' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-[24px] font-bold text-foreground font-manrope mb-[8px]">Security & Account</h3>
              <p className="text-[14px] text-muted-foreground mb-[32px]">Change your password or delete your account.</p>
              
              <div className="bg-surface-container-lowest rounded-[12px] p-[32px] ring-1 ring-border/30 shadow-sm flex flex-col gap-[32px]">
                
                {/* Change Password */}
                <div>
                  <h4 className="text-[16px] font-semibold text-foreground font-manrope mb-[16px]">Change Password</h4>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-[20px] max-w-[480px]">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-[8px]">
                            <FormLabel className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground pb-0">
                              Current Password
                            </FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} className="bg-surface-container-highest border-transparent hover:border-border/50 focus:border-primary/50 text-[14px] h-[44px]" />
                            </FormControl>
                            <FormMessage className="text-[12px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-[8px]">
                            <FormLabel className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground pb-0">
                              New Password
                            </FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Min. 8 characters" {...field} className="bg-surface-container-highest border-transparent hover:border-border/50 focus:border-primary/50 text-[14px] h-[44px]" />
                            </FormControl>
                            <FormMessage className="text-[12px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-[8px]">
                            <FormLabel className="text-[11px] uppercase tracking-[0.05em] font-semibold text-muted-foreground pb-0">
                              Confirm New Password
                            </FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} className="bg-surface-container-highest border-transparent hover:border-border/50 focus:border-primary/50 text-[14px] h-[44px]" />
                            </FormControl>
                            <FormMessage className="text-[12px]" />
                          </FormItem>
                        )}
                      />
                      <div className="pt-[8px]">
                        <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                          {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Update password
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>

                {/* Danger Zone */}
                <div className="bg-error/5 rounded-[12px] p-[32px] ring-1 ring-error/20 mt-[16px]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[16px] font-semibold text-error-dim font-manrope">Danger Zone</h3>
                      <p className="text-[13px] text-error-dim/80 mt-[4px] max-w-[500px]">
                        Permanently delete your account and all associated data. This action is irreversible.
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="shrink-0 bg-error hover:bg-error-dim text-white">
                          <AlertTriangle className="mr-[8px] h-[14px] w-[14px]" />
                          Delete my account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-surface-container-lowest border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-manrope">Delete your account?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            All your boards, cards, and data will be permanently deleted. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-surface-container-high border-transparent text-foreground hover:bg-surface-container">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-error text-white hover:bg-error-dim shadow-none"
                            onClick={async () => {
                              try {
                                await apiFetch("/api/auth/me", { method: "DELETE" });
                                logout();
                              } catch {
                                // Silently swallow
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
          )}

        </div>
      </div>
    </div>
  );
}
