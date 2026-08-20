---
name: Tinjau
description: A customs house for corporate disclosure on tokenised US equities — every filing held, inspected, and stamped before it's a fact.
colors:
  dock: "#17140F"
  dock-raised: "#221D16"
  dock-line: "#393224"
  kraft: "#C69A5B"
  kraft-light: "#DAB77D"
  kraft-dark: "#8C6B39"
  kraft-line: "#3A2C18"
  bone: "#EDE6D6"
  bone-muted: "#A79C87"
  clearance: "#2F7A5D"
  clearance-soft: "#284937"
  duty: "#B23A2E"
  duty-soft: "#4A2620"
  hold: "#C2872A"
  hold-soft: "#4A3A1E"
  tracking: "#5B7CB0"
  tracking-soft: "#26344A"
typography:
  display:
    fontFamily: "Allerta Stencil, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.01em"
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.08em"
  mono:
    fontFamily: "Roboto Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  none: "0px"
  sm: "2px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.kraft}"
    textColor: "{colors.kraft-line}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.kraft-light}"
    textColor: "{colors.kraft-line}"
  button-secondary:
    backgroundColor: "{colors.dock-raised}"
    textColor: "{colors.bone}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  status-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.clearance}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
---

# Design System: Tinjau

## Overview

**Creative North Star: "The Bonded Warehouse"**

Tinjau reads a corporate filing the way a customs house reads a shipping manifest: nothing is believed on arrival, everything is held, inspected against its own paperwork, stamped with the outcome, and only then released. The world is a warehouse dock at night (a deliberate literal reading of the product's original name, AFTERHOURS, when this visual direction was chosen — the product was renamed to Tinjau on 2026-08-20, after the visual system was already built, so the theme's connection to the name is now historical rather than current) — a warm graphite floor, kraft-paper cargo tags standing in for registry entries, and stamp inks reserved one-per-meaning rather than spent as decoration. The system was assigned by this project's concept-seed roll (direction 3 of 7 grounded candidates, seed key `c093dccb`) and raised by three borrowed disciplines: alert-color restraint from a VU-meter-bridge challenger (a color states something or it doesn't appear), chrome-deleted typographic honesty from a Metro-tiles challenger (no gradients, no card bezels standing in for content), and measured-state-over-animation from a blacksmith-forge challenger (every state change reads as an exact before/after figure, never a dramatized transition).

This is a Persuade-mode world on the landing page and an Operate-mode inheritance on the holder digest and forward calendar — same palette and type, denser and more restrained composition once the visitor is doing a task rather than being told what the product is. Every number the system displays is real: an on-chain read, a measured study, or an honest empty state. No visual device stands in for data the product doesn't have.

**Key Characteristics:**
- Warm graphite dock ground, never blue-black slate or cream parchment
- Kraft-tag manifest cards with grommet-hole punches, laid at a slight rotation, straightening on hover
- Stamp-ink accent colors (clearance / duty / hold / tracking) used only for real states, never as page decoration
- A stencil display face for headlines, a workhorse grotesk for body, and monospace reserved for tracking numbers, addresses, hashes, and dates
- No kickers, no hero-metric template, no gradient text, no glass — the craft floor's refusals held throughout

## Colors

A warm, dark, low-saturation ground carries the page; kraft-tag surfaces and stamp inks are where all the color budget goes, and it goes there with intent.

### Primary
- **Kraft** (#C69A5B): the manifest-tag surface itself — the one warm, high-coverage field on every page. Carries the hero registry entry, the primary button, and every compact event card.

### Secondary
- **Dock** (#17140F): the page ground. A warm graphite-brown-black, chosen from the product's own scene (a warehouse floor at night, sodium light, not a screen-glow near-black). Never shifts toward blue.

### Tertiary
- **Tracking blue** (#5B7CB0): the one interactive-link color — every outbound reference (source filing, on-chain record, explorer link) uses this and nothing else, so a visitor learns "blue means leaves the page" once and it holds everywhere.

### Neutral
- **Bone** (#EDE6D6): primary text on the dock ground. A warm off-white, not pure white — reads as manifest paper under low light, not a screen default.
- **Bone Muted** (#A79C87): secondary text, captions, field labels.
- **Dock Raised** (#221D16): the second neutral layer — panels, input fields, footer band, cards inside Operate surfaces.
- **Dock Line** (#393224): borders and dividers throughout.
- **Kraft Line** (#3A2C18): ink color on kraft surfaces — every character on a manifest tag is this color, never pure black.

### Named Rules
**The One Meaning Per Stamp Rule.** Clearance teal (#2F7A5D), duty red (#B23A2E), and hold amber (#C2872A) each mean exactly one thing — verified, disputed, and pending/testnet-disclosure, respectively — and never appear for any other purpose. A page that needs a fourth accent color has a state the system doesn't have a stamp for yet, not permission to reuse one.

## Typography

**Display Font:** Allerta Stencil (with sans-serif fallback)
**Body Font:** Archivo (with sans-serif fallback)
**Label/Mono Font:** Roboto Mono (with monospace fallback)

**Character:** A genuine stencil-cut face carries every headline — chosen because it is what shipping-crate and cargo-tag lettering actually looks like, not as a "technical" costume. Archivo is a plain, confident grotesk built for paragraphs and UI chrome at any density. Roboto Mono is reserved for exactly one job: anything that is literally a tracking number in the product's own model — addresses, tx hashes, dates, balances, agreement counts.

### Hierarchy
- **Display** (400, clamp(1.5rem, 4vw, 3.75rem), 1.05 line-height): page H1s and section H2s, always in the stencil face with +0.01em tracking.
- **Body** (400, 15px, 1.6 line-height): paragraph copy, 65-75ch measure where prose runs long.
- **Label** (400, 11px, 0.08em tracking, uppercase): field captions, nav items, section eyebrows — see the Kicker rule below for where this is and isn't allowed.
- **Mono/data** (400, 11-12px): tabular figures use `font-variant-numeric: tabular-nums` throughout so columns of numbers align.

### Named Rules
**The No-Kicker Rule.** No small uppercase label ever sits above a heading purely to announce the section topic — the heading carries that weight alone. (This was caught and removed from five sections during this build's own finish review; it is recorded here so it is never reintroduced.) The Label style above is for field captions and navigation, never for a heading preamble.

## Layout

Content sits in a `max-w-6xl` (persuade) or `max-w-4xl` (operate) centered container, `px-5` on mobile widening to `px-8` at the `sm` breakpoint (640px). Sections stack with generous vertical rhythm (`py-16` to `py-20` on desktop, tighter on mobile) separated by `border-dock-line/70` hairlines rather than background color changes. The header collapses at `sm` (640px): above it, a single row carries the wordmark, inline nav, and the testnet-disclosure badge; below it, the nav becomes a full-width three-column strip beneath the header row, and the badge shrinks to a one-word "Testnet" chip so nothing wraps. Grids (evidence cards, coverage chips, holdings balances) collapse from 2-3 columns to 1 column below `sm`.

## Elevation & Depth

Flat by default — the dock ground and dock-raised panels carry no shadow of their own. The one elevated object in the system is the manifest tag itself, which uses a real offset-and-blur shadow (`0 18px 40px -12px rgba(0,0,0,0.65)`) to read as a physical card resting on the dock floor, plus a `-rotate-1` transform that straightens on hover — depth here is physical (an object lying at a slight angle), not a UI-chrome affordance.

### Shadow Vocabulary
- **Manifest-tag lift** (`box-shadow: 0 18px 40px -12px rgba(0,0,0,0.65)`): the only shadow in the system; reserved for the kraft cargo-tag card in both its hero and compact sizes.

### Named Rules
**The Flat-Ground Rule.** Every surface that isn't the manifest tag itself is flat at rest — borders and background-color steps (dock → dock-raised) carry hierarchy, not shadow.

## Shapes

Corners are nearly square throughout (`rounded-none` or `rounded-[2px]` at most) — a customs tag, a stamp, and a manifest table don't have soft corners, and the system doesn't borrow them from generic UI habit. The one circular forms in the system are functional: the grommet/punch holes on the manifest tag (a real die-cut detail) and the small state-dot indicators (agreement dots, coverage-chip status dots). Borders are 1px hairlines (`border-dock-line`) except the status stamp, which uses a 2px border to read as stamped ink pressed into the surface.

## Components

### Buttons
- **Shape:** square corners, no radius.
- **Primary:** kraft fill (#C69A5B), kraft-line text (#3A2C18), 12px/20px padding, uppercase mono label, bold weight, +0.08em tracking.
- **Hover:** background lightens to kraft-light (#DAB77D).
- **Secondary:** dock-raised fill, dock-line border, bone text; hover shifts border to kraft/60 and text to kraft-light.

### Manifest Tag (signature component)
The system's one distinctive custom component: a kraft-surfaced card representing one posted registry event. Carries two grommet-hole punches (top corners), a rotated status stamp (clearance/duty/hold, 2px border, `mix-blend-multiply` so it reads as pressed ink), a field grid in tabular mono (effective date, declared amount, bond, posted, next scheduled, severity), an inspector-agreement dot row, a tracking-number readout, and outbound links to the source filing and the on-chain record. Ships in two sizes — `hero` (full detail, used once per page) and `compact` (used in list contexts, same anatomy, smaller type).

### Cards / Containers
- **Corner Style:** square or 2px.
- **Background:** dock-raised on the dock ground; kraft on manifest tags.
- **Shadow Strategy:** none, except the manifest tag (see Elevation).
- **Border:** 1px dock-line hairline.
- **Internal Padding:** 16-24px (`p-4` to `p-6`).

### Inputs / Fields
- **Style:** dock-raised background, 1px dock-line border, mono text, no radius.
- **Focus:** border shifts to kraft.
- **Error:** border and helper text shift to duty red.

### Navigation
Uppercase mono labels, 12px, +0.08em tracking. Active state: kraft/15 background wash with kraft-light text. Inactive: bone-muted, hover shifts to bone with a dock-raised background wash. Mobile: full-width three-column strip with 1px dividers between items, replacing the inline row.

## Do's and Don'ts

### Do:
- **Do** reserve clearance/duty/hold/tracking exclusively for their one state each; a fifth state needs a fifth stamp color, not a reused one.
- **Do** render every tracking number, address, hash, and date in Roboto Mono with `tabular-nums`.
- **Do** disclose testnet/mock-token status inline wherever a token or contract appears, in the hold-amber register, matching the product's own honesty commitment.
- **Do** keep the dock ground warm graphite-brown, never let it drift toward blue-black slate or a lighter cream/parchment tone.

### Don't:
- **Don't** add a kicker/eyebrow label above any heading — removed everywhere it appeared during this build's finish review and never reintroduced.
- **Don't** use gradient text, glass/blur decoration, or a hard offset "neobrutalist" shadow — this world earned none of them.
- **Don't** substitute a glyph or emoji for an icon; the system currently has no drawn icon set, so it uses none rather than a placeholder.
- **Don't** invent a number, balance, or date. Every figure in this product traces to a chain read, a source document, or a published study.
