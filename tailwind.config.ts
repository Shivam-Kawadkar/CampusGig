import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 6px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, hsl(var(--brand-1)) 0%, hsl(var(--brand-2)) 50%, hsl(var(--brand-3)) 100%)",
        "gradient-accent":
          "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(174 72% 45%) 100%)",
        "gradient-mesh":
          "radial-gradient(at 20% 25%, hsl(var(--brand-1) / 0.35) 0px, transparent 50%), radial-gradient(at 80% 20%, hsl(var(--brand-2) / 0.3) 0px, transparent 50%), radial-gradient(at 65% 80%, hsl(var(--brand-3) / 0.28) 0px, transparent 50%)",
        "gradient-aurora":
          "linear-gradient(110deg, hsl(var(--brand-1)), hsl(var(--brand-2)), hsl(var(--brand-3)), hsl(var(--brand-1)))",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgb(15 23 42 / 0.08), 0 4px 16px -4px rgb(15 23 42 / 0.06)",
        lift: "0 8px 24px -6px rgb(79 70 229 / 0.18), 0 4px 12px -4px rgb(15 23 42 / 0.08)",
        glow: "0 0 0 1px hsl(var(--brand-1) / 0.25), 0 10px 40px -8px hsl(var(--brand-1) / 0.5)",
        "glow-accent": "0 0 0 1px hsl(var(--accent) / 0.3), 0 10px 40px -8px hsl(var(--accent) / 0.5)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(24px, -32px) scale(1.08)" },
          "66%": { transform: "translate(-20px, 16px) scale(0.94)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        aurora: {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 hsl(var(--glow) / 0.5)" },
          "50%": { opacity: "0.85", boxShadow: "0 0 0 8px hsl(var(--glow) / 0)" },
        },
        "gradient-x": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        blob: "blob 14s ease-in-out infinite",
        aurora: "aurora 18s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
