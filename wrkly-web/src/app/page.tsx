"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Blocks,
  Bot,
  Zap,
  Users,
  Search,
  LayoutTemplate,
  Github,
  CheckSquare,
  Code2,
  FileText,
  ChevronDown,
  Kanban,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

// ── Auth-aware redirect ───────────────────────────────────────────────────────

function AuthRedirect() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  useEffect(() => {
    if (token) router.replace("/workspaces");
  }, [token, router]);
  return null;
}

// ── Hero board illustration (pure CSS/SVG) ────────────────────────────────────

function BoardIllustration() {
  const lists = [
    {
      name: "To Do",
      color: "#e0e7ff",
      accent: "#4F46E5",
      cards: ["Design system audit", "Write onboarding flow"],
    },
    {
      name: "In Progress",
      color: "#dbeafe",
      accent: "#2563EB",
      cards: ["API integration", "Dashboard layout"],
    },
    {
      name: "Done",
      color: "#dcfce7",
      accent: "#16a34a",
      cards: ["Auth flow", "Database schema"],
    },
  ];

  return (
    <div
      className="relative mx-auto w-full max-w-2xl select-none overflow-hidden rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-2xl shadow-indigo-200/30 backdrop-blur-sm"
      aria-hidden="true"
    >
      {/* "Window chrome" */}
      <div className="mb-4 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-xs font-medium text-slate-400">
          Wrkly — Product Roadmap
        </span>
      </div>

      {/* Lists */}
      <div className="flex gap-3 overflow-hidden">
        {lists.map((list) => (
          <div
            key={list.name}
            className="flex w-48 shrink-0 flex-col gap-2 rounded-xl p-3"
            style={{ backgroundColor: list.color }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: list.accent }}
              />
              <span className="text-xs font-semibold text-slate-700">
                {list.name}
              </span>
            </div>
            {list.cards.map((card) => (
              <div
                key={card}
                className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
              >
                <p className="text-xs text-slate-700 leading-snug">{card}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <div className="h-1.5 w-8 rounded-full bg-slate-200" />
                  <div className="h-4 w-4 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500" />
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-dashed border-slate-300 px-3 py-2 opacity-50">
              <div className="h-2 w-16 rounded-full bg-slate-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Floating label badge */}
      <div className="absolute -right-1 -top-1 rounded-bl-xl rounded-tr-2xl bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
        Live
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}

function FeatureCard({ icon, title, description, accent }: FeatureProps) {
  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-100/50">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Features data ─────────────────────────────────────────────────────────────

const FEATURES: FeatureProps[] = [
  {
    icon: <Blocks className="h-5 w-5" />,
    title: "Rich Content Blocks",
    description:
      "Add text, checklists, code snippets, images, and file attachments inside every card — turning tasks into living documents.",
    accent: "#4F46E5",
  },
  {
    icon: <Bot className="h-5 w-5" />,
    title: "AI-Powered Commands",
    description:
      "Type naturally to create boards, generate task breakdowns, summarize cards, or trigger automations — no menus required.",
    accent: "#7C3AED",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Built-in Automations",
    description:
      "Set trigger–action rules without external tools. Move cards, send notifications, or create tasks automatically on any event.",
    accent: "#EA580C",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Real-Time Collaboration",
    description:
      "See your teammates\u2019 cursors, edits, and comments as they happen. No refreshing, no waiting \u2014 just seamless teamwork.",
    accent: "#0891B2",
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Smart Search",
    description:
      "Find any card, board, or comment in milliseconds. Hit Cmd+K anywhere to search across your entire workspace instantly.",
    accent: "#059669",
  },
  {
    icon: <LayoutTemplate className="h-5 w-5" />,
    title: "Templates",
    description:
      "Start fast with pre-built board and card templates. Save your own workflows and apply them to new projects in one click.",
    accent: "#D97706",
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <AuthRedirect />

      <div className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
        {/* ── Nav ── */}
        <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Kanban className="h-4.5 w-4.5" />
              </div>
              <span className="text-lg font-bold tracking-tight">Wrkly</span>
            </Link>

            {/* Nav links */}
            <nav className="hidden items-center gap-6 sm:flex">
              <a
                href="#features"
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Features
              </a>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Get started
              </Link>
            </nav>

            {/* Mobile: just the CTA */}
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white sm:hidden"
            >
              Get started
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/40 to-white px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          {/* Background blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl">
            <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
              {/* Copy */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                  </span>
                  Now with AI commands
                </div>

                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] xl:text-6xl">
                  The workflow tool{" "}
                  <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    that thinks with you
                  </span>
                </h1>

                <p className="mt-5 text-lg leading-relaxed text-slate-500 sm:text-xl">
                  A customizable board system with rich content blocks, AI
                  commands, and automation — built for teams that move fast.
                </p>

                {/* CTAs */}
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href="/register"
                    className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-300/40 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300/50"
                  >
                    Get Started Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="#features"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    See Features
                    <ChevronDown className="h-4 w-4" />
                  </a>
                </div>

                {/* Social proof */}
                <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 lg:justify-start">
                  <CheckSquare className="h-3.5 w-3.5 text-green-500" /> Free
                  forever for personal use
                  <span className="mx-1 text-slate-300">·</span>
                  <CheckSquare className="h-3.5 w-3.5 text-green-500" /> No
                  credit card required
                </p>
              </div>

              {/* Illustration */}
              <div className="relative">
                <BoardIllustration />
                {/* Floating feature pill */}
                <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lg shadow-slate-200/80 ring-1 ring-black/5">
                  <Code2 className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-medium text-slate-700">
                    Code blocks included
                  </span>
                </div>
                <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lg shadow-slate-200/80 ring-1 ring-black/5">
                  <FileText className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-medium text-slate-700">
                    Rich text + checklists
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section
          id="features"
          className="bg-slate-50/60 px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Everything your team needs
              </h2>
              <p className="mt-3 text-lg text-slate-500">
                From simple task tracking to powerful automation — all in one
                place.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA banner ── */}
        <section className="relative overflow-hidden bg-indigo-600 px-4 py-16 sm:px-6 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to work smarter?
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Join teams who moved their workflow to Wrkly. Set up your first
              board in under 2 minutes.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold text-indigo-700 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-100 bg-white px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Kanban className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-700">
                Wrkly
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400">
                Built by Mohit Kumar
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-5">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                Sign up
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
