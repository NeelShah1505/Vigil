import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#060A12",
        surface: {
          DEFAULT: "#0D1527",
          subtle: "#0F1A30",
          card: "#121E36",
          hover: "#182847",
          border: "rgba(255, 255, 255, 0.08)",
        },
        brand: {
          teal: "#22D3A7",
          emerald: "#10B981",
          cyan: "#00E5FF",
          purple: "#8B5CF6",
          violet: "#A78BFA",
          hedera: "#2C3440",
        },
        accent: {
          healthy: "#22D3A7",
          critical: "#F43F5E",
          warn: "#F59E0B",
          info: "#00E5FF",
        },
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        "glow-teal": "0 0 30px -5px rgba(34, 211, 167, 0.25)",
        "glow-cyan": "0 0 30px -5px rgba(0, 229, 255, 0.25)",
        "glow-purple": "0 0 30px -5px rgba(139, 92, 246, 0.25)",
        "glow-red": "0 0 30px -5px rgba(244, 63, 94, 0.25)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flow-dash": "flowDash 20s linear infinite",
      },
      keyframes: {
        flowDash: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
