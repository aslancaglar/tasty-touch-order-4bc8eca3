
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        'bebas': ['"Bebas Neue"', 'cursive'],
        'inter': ['"Inter"', 'sans-serif'],
      },
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom colors for our kiosk theme
        kiosk: {
          primary: "#7C3AED", // Purple
          secondary: "#E5E7EB",
          accent: "#F9FAFB",
          neutral: "#6B7280",
          "neutral-light": "#9CA3AF",
          "base-100": "#FFFFFF",
          info: "#3ABFF8",
          success: "#36D399",
          warning: "#FBBD23",
          error: "#F87272",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        stableAppear: {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fadeIn": "fadeIn 0.3s ease-out forwards",
        "slideUp": "slideUp 0.4s ease-out",
        "stableAppear": "stableAppear 0.25s ease-out forwards",
      },
      width: {
        'screen-90': '90vw',
      },
      maxWidth: {
        'screen-90': '90vw',
      },
      fontSize: {
        // Add responsive font sizes
        'responsive-xs': ['0.75rem', { lineHeight: '1rem' }],      // xs
        'responsive-sm': ['0.875rem', { lineHeight: '1.25rem' }],  // sm
        'responsive-base': ['1rem', { lineHeight: '1.5rem' }],     // base
        'responsive-lg': ['1.125rem', { lineHeight: '1.75rem' }],  // lg
        'responsive-xl': ['1.25rem', { lineHeight: '1.75rem' }],   // xl
        'responsive-2xl': ['1.5rem', { lineHeight: '2rem' }],     // 2xl
        'responsive-3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 3xl
        'responsive-4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 4xl
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
