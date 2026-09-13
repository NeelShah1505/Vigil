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
        // Aegis Deskwork / Warm Editorial Palette
        desk: {
          DEFAULT: "#F4F0E8",
          raised: "#FAF7F0",
          darker: "#ECE6DA",
          line: "#DCD4C4",
        },
        paper: {
          DEFAULT: "#FFFFFF",
          warm: "#FCFAF6",
          muted: "#F7F4EE",
          border: "#E8E2D4",
        },
        ink: {
          DEFAULT: "#1C1915",
          muted: "#5A544A",
          faint: "#8C8375",
          border: "#DCD4C4",
        },
        terracotta: {
          DEFAULT: "#A8341E",
          hover: "#8F2C19",
          subtle: "rgba(168, 52, 30, 0.08)",
          border: "rgba(168, 52, 30, 0.25)",
        },
        sage: {
          DEFAULT: "#2B6B44",
          light: "#EAF3ED",
          border: "#B2D8C0",
        },
        amber: {
          DEFAULT: "#9E6B15",
          light: "#FBF3DE",
          border: "#E9D29A",
        },
        slateInk: {
          DEFAULT: "#1E2530",
          card: "#262F3D",
        },
      },
      fontFamily: {
        serif: ["'Spectral'", "Georgia", "serif"],
        sans: ["'Space Grotesk'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        paper: "0 1px 3px rgba(33, 28, 20, 0.05), 0 10px 24px -6px rgba(33, 28, 20, 0.04)",
        "paper-hover": "0 4px 12px rgba(33, 28, 20, 0.08), 0 16px 32px -8px rgba(33, 28, 20, 0.06)",
        card: "0 2px 8px rgba(0, 0, 0, 0.04)",
        subtle: "0 1px 2px rgba(0, 0, 0, 0.03)",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
