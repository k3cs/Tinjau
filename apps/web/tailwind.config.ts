import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        data: ["var(--font-data)", "monospace"],
      },
      letterSpacing: {
        display: "-0.035em",
      },
    },
  },
  plugins: [],
};

export default config;
