import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dock: {
          DEFAULT: "#17140F",
          raised: "#221D16",
          line: "#393224",
        },
        kraft: {
          DEFAULT: "#C69A5B",
          light: "#DAB77D",
          dark: "#8C6B39",
          line: "#3A2C18",
        },
        bone: {
          DEFAULT: "#EDE6D6",
          muted: "#A79C87",
        },
        clearance: {
          DEFAULT: "#2F7A5D",
          soft: "#284937",
        },
        duty: {
          DEFAULT: "#B23A2E",
          soft: "#4A2620",
        },
        hold: {
          DEFAULT: "#C2872A",
          soft: "#4A3A1E",
        },
        tracking: {
          DEFAULT: "#5B7CB0",
          soft: "#26344A",
        },
      },
      fontFamily: {
        stencil: ["var(--font-stencil)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-tracking-mono)", "monospace"],
      },
      backgroundImage: {
        "corrugate": "repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 6px)",
        "kraft-fiber": "repeating-linear-gradient(115deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, transparent 1px, transparent 3px)",
      },
      letterSpacing: {
        tightest: "-0.04em",
        stencil: "0.01em",
      },
    },
  },
  plugins: [],
};

export default config;
