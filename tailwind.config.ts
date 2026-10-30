import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // One corner radius app-wide; set --radius in client/src/index.css
      borderRadius: {
        sm: "var(--radius)",
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius)",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        "3xl": "var(--radius)",
      },
      colors: {
        // Design-system tokens (client/src/ds.css), e.g. text-ds-ink, bg-ds-pop,
        // border-ds-line-strong. They follow the brand and light/dark theme.
        ds: {
          ink: "var(--ds-ink)",
          "ink-soft": "var(--ds-ink-soft)",
          "ink-muted": "var(--ds-ink-muted)",
          "ink-faint": "var(--ds-ink-faint)",
          page: "var(--ds-page)",
          surface: "var(--ds-surface)",
          sunken: "var(--ds-surface-sunken)",
          hover: "var(--ds-surface-hover)",
          line: "var(--ds-line)",
          "line-strong": "var(--ds-line-strong)",
          hairline: "var(--ds-hairline)",
          shadow: "var(--ds-shadow)",
          chrome: "var(--ds-chrome)",
          "chrome-raised": "var(--ds-chrome-raised)",
          "chrome-text": "var(--ds-chrome-text)",
          "chrome-muted": "var(--ds-chrome-muted)",
          "chrome-line": "var(--ds-chrome-line)",
          "chrome-hover": "var(--ds-chrome-hover)",
          accent: "var(--ds-accent)",
          "accent-contrast": "var(--ds-accent-contrast)",
          "accent-soft": "var(--ds-accent-soft)",
          pop: "var(--ds-pop)",
          "pop-contrast": "var(--ds-pop-contrast)",
          info: "var(--ds-info)",
          danger: "var(--ds-danger)",
          "danger-soft": "var(--ds-danger-soft)",
          success: "var(--ds-success)",
          coral: "var(--ds-reef-coral)",
          rose: "var(--ds-reef-rose)",
          gold: "var(--ds-reef-gold)",
          lagoon: "var(--ds-reef-lagoon)",
          blue: "var(--ds-reef-blue)",
          lilac: "var(--ds-reef-lilac)",
          kelp: "var(--ds-reef-kelp)",
          sand: "var(--ds-reef-sand)",
        },
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
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "zoom-in": {
          from: { transform: "scale(0.95)" },
          to: { transform: "scale(1)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "zoom-in": "zoom-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;