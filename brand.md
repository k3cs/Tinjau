# Brand — Tinjau

Bounded LP risk autopilot for tokenized-stock liquidity on X Layer.

_Generated from the user-approved design direction on 2026-08-21._

## Palette — X Layer Evidence

**Vibe:** institutional · technical · restrained  
**Category:** DeFi / infrastructure  
**Mood:** serious · technical

### Seeds

| Role | OKLCH | Hex |
|---|---|---|
| paper | `oklch(0.97 0.008 106)` | `#F5F5F0` |
| carbon | `oklch(0 0 0)` | `#000000` |
| elevated carbon | `oklch(0.18 0 0)` | `#1D1D1D` |
| signal | `oklch(0.92 0.22 120)` | `#BCFF2F` |
| ink | `oklch(0 0 0)` / `oklch(1 0 0)` | `#000000` / `#FFFFFF` |

Pure black is an intentional OKX/X Layer brand token. Electric lime indicates interaction, an active system
path, or authorized energy; it is not a risk state.

Semantic states:

- `NORMAL`: `#31BD65`
- `WATCH`: `#F76816`
- `PROTECT`: `#F04872`
- confirmation/proof: `#4283FF`

### Contrast

Primary black/white and black/lime pairs exceed WCAG AA. Muted copy uses `#5B5B57` on paper and `#B3B3B3`
on carbon. Focus uses electric lime on carbon and a black outer offset on paper so it remains visible on both
surfaces.

## Typography — Inter Tight + Inter + JetBrains Mono

- **Display:** Inter Tight
- **Body / interface:** Inter
- **Numbers, addresses, timestamps, and reason codes:** JetBrains Mono with tabular numerals

The stack is wired with `next/font/google` in `apps/web/src/app/layout.tsx`.

Use no more than three weights and five sizes on one route. Headlines are sentence case. Uppercase is reserved
for short operational labels.

## Gradients (not used)

The serious, technical direction relies on flat fields, rules, typography, and state changes. Gradients,
glass, glow, and decorative noise are intentionally excluded.

## Tone and voice

Use direct, specific, factual language. Prefer a tested rule, timestamp, state, or constraint over an
adjective. Explain what the system observed, decided, authorized, blocked, or could not verify.

Avoid hype words, exclamation marks, vague AI language, and claims of novelty or economic impact without
evidence. `Revolutionary`, `game-changing`, `best-in-class`, `unlock`, and `AI-powered future` do not belong in
the public interface.

Voice example:

> Rumor observed. Official support absent. WATCH recorded. Aggressive fee blocked.

## Usage

Do:

- build structure with 1px rules, alignment, and whitespace;
- use paper for product explanation and carbon for operational inspection;
- show capability maturity separately from data mode;
- use mono type for data that a judge may verify;
- reserve semantic colors for semantic meaning.

Don't:

- create a three-card feature grid, decorative bento layout, or cards inside cards;
- use `transition-all`, perpetual motion, parallax, floating shapes, or generic icon circles;
- copy Tailark Quartz source without a valid license;
- present replay, simulation, historical code, or pending integration as live.

---

_Last updated: 2026-08-21 via `brand-design` workflow. Palette: X Layer Evidence · Typography: Inter Tight +
Inter + JetBrains Mono · Gradients: none._
