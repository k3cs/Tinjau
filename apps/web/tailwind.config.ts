import type { Config } from "tailwindcss";

/**
 * Tokens mirror the OKX Design System ("okd") variables shipped on
 * https://web3.okx.com/xlayer, read from that page's own stylesheets on
 * 2026-08-21. The extraction and the two places we deliberately diverge are
 * recorded in DESIGN.md.
 *
 * Semantic risk colours are Tinjau's own meaning applied to OKX's functional
 * ramp, so a judge who knows X Layer reads our states without relearning them.
 *
 * **Dark is the only theme.** The light half of the OKX ramp (`paper`, `coal`,
 * `edge-light`, and the `-deep` text steps) was deleted rather than left unused,
 * because an unused token is an invitation: the next component that reaches for
 * `bg-paper-bright` would silently punch a white hole in a black page. There is
 * no token to reach for now, and `test/writing-rules.test.ts` fails the build if
 * one of the old names reappears in a class string.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- OKX dark surfaces ---
        canvas: {
          DEFAULT: "#000000", // --okd-color-background-base-primary (dark)
          soft: "#121212", // --okd-color-background-base-secondary (dark)
          sunken: "#0E0E0E", // --okd-color-card-primary (dark)
        },
        surface: {
          DEFAULT: "#1D1D1D", // --okd-color-background-surface-primary (dark)
          raised: "#272727", // --okd-color-background-surface-contrast (dark)
          pressed: "#383838", // --okd-color-background-surface-pressed (dark)
        },
        // --- OKX dark content ramp ---
        ink: {
          DEFAULT: "#FFFFFF", // --okd-color-content-primary (dark)
          secondary: "#E6E6E6", // --okd-color-content-secondary (dark)
          muted: "#B3B3B3", // --okd-color-content-tertiary (dark)
          faint: "#969696", // --okd-color-content-static-subtle (dark)
          disabled: "#5B5B5B", // --okd-color-content-disabled (dark)
        },
        edge: {
          DEFAULT: "#383838", // --okd-color-border-primary (dark)
          strong: "#4D4D4D", // --okd-color-border-secondary (dark)
        },
        // --- OKX brand ---
        signal: {
          DEFAULT: "#BCFF2F", // --okd-color-background-surface-brand (dark)
          soft: "#E6FFB0", // --okd-color-brand-content
        },
        // --- Tinjau semantics, drawn from OKX's functional colours ---
        // Two steps each. `DEFAULT` is for fills, borders and large type; `soft`
        // is the lighter step used when the colour has to carry small text on
        // carbon, where the fill step lands near the AA boundary.
        normal: {
          DEFAULT: "#31BD65", // --okd-color-fq-positive
          soft: "#12E366", // --okd-color-categorical-04
        },
        watch: {
          DEFAULT: "#F76816", // --okd-color-fq-warning (dark)
          soft: "#FFB729", // --okd-color-content-dataviz-categorical-3 (dark)
        },
        protect: {
          DEFAULT: "#F04872", // --okd-color-fq-critical (dark)
          soft: "#FF7888", // --okd-color-categorical-05
        },
        confirm: {
          DEFAULT: "#4283FF", // --okd-color-blue-900 (dark)
          soft: "#6BA6FF", // --okd-color-blue-400
        },
        maturity: {
          implemented: "#31BD65",
          historical: "#4283FF",
          pending: "#F76816",
          roadmap: "#969696",
        },
      },
      fontFamily: {
        // OKXSans / OKXSansMono are proprietary and not redistributable, so the
        // licensed Inter family stands in at the same weights and the fallback
        // chain after it is OKX's own. See DESIGN.md.
        display: ["var(--font-display)", "HarmonyOS Sans", "SF Pro Display", "Arial", "sans-serif"],
        body: ["var(--font-body)", "HarmonyOS Sans", "SF Pro Text", "Arial", "sans-serif"],
        data: ["var(--font-data)", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // --okd-text-* scale, verbatim
        overline: ["12px", { lineHeight: "15px", letterSpacing: "0.06em", fontWeight: "500" }],
        "body-xs": ["12px", { lineHeight: "18px" }],
        "body-sm": ["14px", { lineHeight: "21px" }],
        "body-md": ["16px", { lineHeight: "24px" }],
        "heading-sm": ["18px", { lineHeight: "24px", fontWeight: "500" }],
        "heading-md": ["24px", { lineHeight: "30px", fontWeight: "500" }],
        "heading-lg": ["30px", { lineHeight: "40px", fontWeight: "500" }],
        "heading-xl": ["36px", { lineHeight: "1.32", fontWeight: "600" }],
        "heading-xxl": ["40px", { lineHeight: "1.32", fontWeight: "600" }],
        "display-md": ["40px", { lineHeight: "52px", fontWeight: "500" }],
        "display-lg": ["56px", { lineHeight: "1.32", fontWeight: "500" }],
        // The X Layer hero: large, medium weight, sub-1.0 leading.
        "hero-sm": ["36px", { lineHeight: "0.95", letterSpacing: "-0.02em", fontWeight: "500" }],
        "hero-md": ["62px", { lineHeight: "0.95", letterSpacing: "-0.025em", fontWeight: "500" }],
        "hero-lg": ["72px", { lineHeight: "0.95", letterSpacing: "-0.03em", fontWeight: "500" }],
        // Section headings on web3.okx.com/xlayer: 42px → 48px at 0.90 leading.
        "section-sm": ["32px", { lineHeight: "0.95", letterSpacing: "-0.02em", fontWeight: "500" }],
        "section-lg": ["48px", { lineHeight: "0.90", letterSpacing: "-0.025em", fontWeight: "500" }],
      },
      borderRadius: {
        // --okd-border-radius-*
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
        "3xl": "12px",
        pill: "60px", // --okd-button-*-border-radius
      },
      transitionTimingFunction: {
        // OKX motion reads as a fast settle rather than a bounce.
        tinjau: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sweep-in": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        /*
         * Diagram vocabulary. `draw` traces a path in the direction the system
         * actually runs, so the animation carries the reading order rather than
         * decorating it. Every one of these uses `both`, so the global
         * reduced-motion rule (which collapses the duration to 0.01ms) leaves the
         * finished state on screen instead of a half-drawn line.
         */
        draw: {
          from: { strokeDashoffset: "var(--draw-length, 1000)" },
          to: { strokeDashoffset: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-right": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "stop-short": {
          "0%": { transform: "translateX(-40px)", opacity: "0" },
          "60%": { transform: "translateX(0)", opacity: "1" },
          "72%": { transform: "translateX(-4px)", opacity: "1" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        "rise-in": "rise-in 380ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "sweep-in": "sweep-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both",
        draw: "draw 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "draw-slow": "draw 1400ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-up": "fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-right": "fade-right 420ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "stop-short": "stop-short 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
