import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // ── Wrkly / Lumina Workspace tokens ──────────────────────────────
        // Usage: bg-wrkly-surface, text-wrkly-on-surface, etc.
        // All map to --wrkly-* CSS vars defined in globals.css (from Stitch)
        wrkly: {
          primary: "var(--wrkly-primary)",
          "primary-container": "var(--wrkly-primary-container)",
          "primary-dim": "var(--wrkly-primary-dim)",
          "on-primary": "var(--wrkly-on-primary)",
          secondary: "var(--wrkly-secondary)",
          "secondary-container": "var(--wrkly-secondary-container)",
          "on-secondary": "var(--wrkly-on-secondary)",
          tertiary: "var(--wrkly-tertiary)",
          "tertiary-container": "var(--wrkly-tertiary-container)",
          "on-tertiary": "var(--wrkly-on-tertiary)",
          surface: "var(--wrkly-surface)",
          "surface-low": "var(--wrkly-surface-low)",
          "surface-container": "var(--wrkly-surface-container)",
          "surface-high": "var(--wrkly-surface-high)",
          "surface-highest": "var(--wrkly-surface-highest)",
          "surface-lowest": "var(--wrkly-surface-lowest)",
          "surface-dim": "var(--wrkly-surface-dim)",
          "on-surface": "var(--wrkly-on-surface)",
          "on-surface-variant": "var(--wrkly-on-surface-variant)",
          outline: "var(--wrkly-outline)",
          "outline-variant": "var(--wrkly-outline-variant)",
          error: "var(--wrkly-error)",
          "on-error": "var(--wrkly-on-error)",
          "inverse-surface": "var(--wrkly-inverse-surface)",
          "inverse-on-surface": "var(--wrkly-inverse-on-surface)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;

