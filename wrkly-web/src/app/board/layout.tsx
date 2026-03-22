import AppShell from "@/components/layout/app-shell";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
