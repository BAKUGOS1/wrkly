import AppShell from "@/components/layout/app-shell";

export default function WorkspacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
