import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F5F5F0",
          bright: "#FFFFFF",
          soft: "#ECECE5",
        },
        coal: {
          DEFAULT: "#000000",
          soft: "#1F1F1C",
          muted: "#5B5B57",
        },
        canvas: {
          DEFAULT: "#000000",
          soft: "#121212",
        },
        surface: {
          DEFAULT: "#1D1D1D",
          raised: "#272727",
        },
        ink: {
          DEFAULT: "#FFFFFF",
          secondary: "#E6E6E6",
          muted: "#B3B3B3",
        },
        edge: {
          DEFAULT: "#383838",
          strong: "#4D4D4D",
        },
        signal: "#BCFF2F",
        normal: "#31BD65",
        watch: "#F76816",
        protect: "#F04872",
        confirm: "#4283FF",
        maturity: {
          implemented: "#31BD65",
          historical: "#4283FF",
          pending: "#F76816",
          roadmap: "#8A8A84",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        data: ["var(--font-data)", "monospace"],
      },
      letterSpacing: {
        display: "-0.035em",
      },
      transitionTimingFunction: {
        tinjau: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
