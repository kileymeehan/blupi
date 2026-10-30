import type { Config } from "tailwindcss";

// Reef neutral scale (claude-sandbox/design-system). 500+ meet 4.5:1 as text on white.
const reefGray = {
  50: "#F8F5F0",
  100: "#F1ECE5",
  200: "#E4DDD3",
  300: "#CDC5BA",
  400: "#97A1A7",
  500: "#63707A",
  600: "#55646E",
  700: "#435563",
  800: "#2C3E4A",
  900: "#1C2D38",
  950: "#14242E",
};

// Reef status scales (claude-sandbox/design-system): Tailwind's colour families
// re-cut from reef hues and muted, so red-*, blue-*, green-* etc. match the system.
// Text steps (600+ on white, 700 on 100) meet 4.5:1; card types use explicit colours.
const reefScales = {
  red: { 50: "#FAF5F5", 100: "#F4E9E7", 200: "#EBD1CC", 300: "#DCAFA7", 400: "#CE8173", 500: "#B55140", 600: "#934234", 700: "#753429", 800: "#5B2920", 900: "#441E18", 950: "#26110D" },
  blue: { 50: "#F5F8FA", 100: "#E7EEF3", 200: "#CDDEEA", 300: "#A9C6DB", 400: "#76A8CB", 500: "#4689B9", 600: "#3A7098", 700: "#2E5A7A", 800: "#244760", 900: "#1C374A", 950: "#11212C" },
  green: { 50: "#F6F9F7", 100: "#E9F1ED", 200: "#D1E6DB", 300: "#B0D3C1", 400: "#82BF9F", 500: "#4E9770", 600: "#3E795A", 700: "#315E46", 800: "#244734", 900: "#1A3225", 950: "#0C1811" },
  amber: { 50: "#FBF8F4", 100: "#F5EEE5", 200: "#EEDEC9", 300: "#E2C6A2", 400: "#D7A86A", 500: "#C98936", 600: "#A5712C", 700: "#855B23", 800: "#69471C", 900: "#513715", 950: "#30210D" },
  yellow: { 50: "#FBF9F4", 100: "#F5F1E5", 200: "#EFE5C7", 300: "#E4D2A0", 400: "#DBBC66", 500: "#CAA12F", 600: "#A58427", 700: "#84691F", 800: "#675218", 900: "#4E3E12", 950: "#2D240B" },
  violet: { 50: "#F7F6F9", 100: "#ECE9F1", 200: "#DAD1E6", 300: "#BFB0D3", 400: "#9C82BF", 500: "#7E5DAC", 600: "#684B91", 700: "#543D76", 800: "#44315E", 900: "#35264A", 950: "#22182F" },
  purple: { 50: "#F8F6F9", 100: "#EEE9F1", 200: "#DED2E4", 300: "#C7B2D1", 400: "#A986BB", 500: "#9062A7", 600: "#784F8C", 700: "#624072", 800: "#4E335B", 900: "#3D2848", 950: "#271A2E" },
  teal: { 50: "#F5F9FA", 100: "#E8F2F3", 200: "#CEE6E9", 300: "#ABD4D9", 400: "#79C0C8", 500: "#449DA7", 600: "#377E86", 700: "#2B6369", 800: "#214B50", 900: "#18373A", 950: "#0C1B1D" },
  cyan: { 50: "#F5F9FA", 100: "#E8F1F3", 200: "#CEE4E8", 300: "#ACD0D8", 400: "#7BBAC6", 500: "#4695A4", 600: "#397884", 700: "#2C5E68", 800: "#22474F", 900: "#183439", 950: "#0C1A1D" },
  orange: { 50: "#FBF6F4", 100: "#F5EBE6", 200: "#EDD5CA", 300: "#E0B8A4", 400: "#D58F6D", 500: "#BE6437", 600: "#9A512D", 700: "#7B4124", 800: "#5F321C", 900: "#472515", 950: "#28150B" },
  indigo: { 50: "#F5F6F9", 100: "#E9EAF2", 200: "#D0D3E6", 300: "#AFB4D5", 400: "#8189C1", 500: "#5B66AE", 600: "#485293", 700: "#3B4378", 800: "#2F3660", 900: "#252A4B", 950: "#181B30" },
  pink: { 50: "#FAF5F7", 100: "#F3E8EC", 200: "#E8CED8", 300: "#D8ACBC", 400: "#C67B97", 500: "#B65478", 600: "#9A4262", 700: "#7D3650", 800: "#642B40", 900: "#4F2232", 950: "#321520" },
  rose: { 50: "#FAF5F6", 100: "#F3E8E9", 200: "#E9CED2", 300: "#D9ABB2", 400: "#C87986", 500: "#B85162", 600: "#9C404F", 700: "#7F3440", 800: "#652933", 900: "#502128", 950: "#33151A" },
  fuchsia: { 50: "#F9F6F9", 100: "#F1E9F0", 200: "#E6D1E2", 300: "#D3B0CE", 400: "#BF82B5", 500: "#AC5D9F", 600: "#914B85", 700: "#763D6C", 800: "#5E3157", 900: "#4A2644", 950: "#2F182B" },
  emerald: { 50: "#F5F9F8", 100: "#E8F2EE", 200: "#D0E7DD", 300: "#AFD5C5", 400: "#80C2A6", 500: "#4B9B79", 600: "#3C7C61", 700: "#2E604C", 800: "#234839", 900: "#193428", 950: "#0C1813" },
  sky: { 50: "#F5F8FA", 100: "#E7EFF3", 200: "#CDE0EA", 300: "#A9CADB", 400: "#76AFCB", 500: "#4693B9", 600: "#3A7898", 700: "#2E617A", 800: "#244C60", 900: "#1C3B4A", 950: "#11232C" },
  lime: { 50: "#F8F9F5", 100: "#EEF2E8", 200: "#DDE7D0", 300: "#C5D5AF", 400: "#A6C280", 500: "#799B4B", 600: "#617C3C", 700: "#4C602E", 800: "#394823", 900: "#283419", 950: "#13180C" },
};

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
        // Reef neutrals: Tailwind's gray (and slate) scale, from sand to deep sea,
        // so the 400+ existing gray-* classes match the design system
        gray: reefGray,
        slate: reefGray,
        ...reefScales,
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