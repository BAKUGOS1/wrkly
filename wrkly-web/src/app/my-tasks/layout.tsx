import AppShell from "@/components/layout/app-shell";

export default function MyTasksLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
