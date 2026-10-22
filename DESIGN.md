# Sane Living — Design System (DESIGN.md)
Adopted Oct 20, 2026, following the DESIGN.md format (see
VoltAgent/awesome-design-md). Any person or AI tool working on this site
should follow this file so every page looks like one place. The live tokens
live in `public/style.css` (`:root` + the "V2 DESIGN POLISH" section).

## Visual theme & atmosphere
Warm, calm, premium — a photography-first venue site (weddings and gatherings
in Ojai). Soft shadows and gentle motion, never harsh or neon. Style reference:
"Soft UI Evolution" (soft shadows, subtle depth, calming, premium feel).
Borrowed patterns: Airbnb (photography-driven, rounded UI, warm accent),
Stripe/Linear (single purple accent, generous whitespace, precise type).

## Color palette & roles
| Role | Value | Use |
|---|---|---|
| Ink | `#231f20` | Text, footer, dark bands |
| Deep plum | `#2a1a33` | Page-hero gradient start, headings on dark |
| Brand purple (accent) | `#8a56a0` | Primary buttons, links, labels, prices accents |
| Accent hover | `#7a489a` | Hover state of accent |
| Light violet | `#a678c4` | Gradient end, soft highlights |
| Tint wash | `#f3ecf9` | Hover washes, chip backgrounds |
| Background | `#ffffff` | Page canvas |
| Elevated bg | `#f7f7f7` | Alternating sections |
| Card bg | `#ffffff` | Cards sit on elevated bg with shadow |
| Border | `#e0e0e0` | Hairlines only; prefer shadow over borders |
| Muted text | `#555555` | Secondary text (4.5:1+ on white) |

Rules: one accent (purple) — no second brand color. Gradients only
plum → purple → light violet, and only on heroes and primary headers.
Never purple text on purple; white text on purple bands.

## Typography
- Display/headings: **Nunito** (700–800), body: **Nunito/Open Sans**.
- Page titles: `clamp(2rem, 5vw, 3.1rem)`, tight leading (1.15), headings are
  NOT all-caps except small labels.
- Eyebrow labels: 12px, 700, uppercase, letter-spacing 0.15em, accent color,
  shown as a small pill on hero bands.
- Body: 17px / 1.75 line-height. Secondary text 0.95rem muted.
- Numbers/prices: 700 weight, ink color (accent only in table headers).

## Layout principles
- Max content width 1100px; text blocks 800px.
- 8-point spacing rhythm via the `--space-*` scale (xs .25rem → 3xl 6rem).
- Sections: `--space-2xl` vertical padding; alternate white / elevated bg.
- Cards: radius 16px, soft shadow (`--shadow-soft`), hover lift −4px.
- Images: radius 14–16px, `object-fit: cover`, subtle zoom on hover (1.04).

## Components
- **Buttons:** pill radius (999px), 12px uppercase 700 label, primary =
  purple bg/white text with soft purple shadow; hover lifts 2px and deepens.
  Outline = 2px purple border, fills on hover. Every clickable gets
  `cursor: pointer`, a 150–300ms transition, and a visible focus ring.
- **Page hero:** plum→purple gradient band, white title, soft white subtitle,
  label as translucent pill. One hero pattern for every sub-page.
- **Event cards / rent cards:** photo top (16:10), padded body, date in accent.
- **Calendar:** white card, radius 16, soft shadow; day headers small caps
  muted; today = purple ring; events = purple pill chips.
- **Tables (pricing):** dark ink header row, zebra rows, hover wash `#f3ecf9`.
- **Gallery:** uniform grid tiles, caption under photo, filter pills
  (active = purple fill).

## Motion & accessibility (pre-delivery checklist, from UI UX Pro Max)
- Transitions 150–300ms ease; respect `prefers-reduced-motion`.
- Text contrast ≥ 4.5:1; focus states always visible.
- No emojis as icons — use SVG or typographic symbols only.
- Check responsive at 375 / 768 / 1024 / 1440 px before calling a page done.

## Don'ts
- No new fonts without updating this file. No stock/AI imagery for the venue —
  only real Sane Living photos. No drop shadows heavier than `--shadow-lg`.

## Staff dashboard and editor workspace (October 22, 2026)

The public marketing rules above remain the venue website's baseline. Dashboard chrome uses the confirmed context in `.impeccable.md`: calm, welcoming, precise, with a readable desktop/phone workflow and a dark editor option.

- Dashboard tokens: `public/dash/workspace.css`; editor tokens: `editor/src/workspace-polish.css`. Keep workspace styles outside the iframe so the canvas remains faithful to the website.
- Keep existing Nunito branding; use regular body weight, 600–700 for controls, and strong page headings. Fixed rem-based UI sizes replace arbitrary tiny text; use tabular numerals for counts and rates.
- Use the shared 4px spacing scale, quiet hairlines, warm neutral surfaces, and restrained plum actions. Group with whitespace and separators; reserve cards for independent editing surfaces and photo frames. No new decorative gradients, accent stripes, heavy shadows or generic icon tiles.
- Fields need visible boundaries, readable values, keyboard focus and full-sized mobile targets. Action hierarchy distinguishes a draft save from publication; error/offline feedback stays persistent where necessary.
- Desktop Home pairs the real venue calendar with task links. Mobile stacks them and keeps navigation scrollable. Settings categories, gallery collection boundaries, source content ownership and staff saves remain intact.
- Floating canvas controls stay compact. Detailed sizing/style controls remain in the inspector; whole sections still move in Layers.

Guidance applied from [ByChokeYT/Impecable](https://github.com/ByChokeYT/Impecable/tree/d0453bffd697f6fdd08e5d5244643d6afadcc7de/source/skills): impeccable context, polish, typeset and adapt. This is an adaptation to the existing product, not an installed skill bundle or copied editor runtime.
