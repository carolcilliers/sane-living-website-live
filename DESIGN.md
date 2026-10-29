# Sane Living — Design System (DESIGN.md)
Adopted Oct 20, 2026; **V3 foundation adopted Oct 22, 2026.** Follows the
DESIGN.md format (see VoltAgent/awesome-design-md). Any person or AI tool
working on this site should follow this file so every page looks like one
place. The live tokens are in `public/style.css` — the "V3 FOUNDATION"
section at the end overrides the older `:root` and "V2 DESIGN POLISH" values.

## Visual theme & atmosphere
Warm, calm, immersive and professional — a photography-first venue site
(weddings, workshops and gatherings in downtown Ojai) that guides visitors
from first impression to booking. Sane Living's purple and logo stay the
brand anchor; everything around them is warm cream and sand rather than stark
white and grey. Inspiration (feel only, never copied): boutique wellness and
gathering spaces — Behind the Lids, Wild Qi, Light and Space Yoga — for warm
neutrals, elegant serif headings, big real photography and generous space.

## Color palette & roles
| Role | Value | Use |
|---|---|---|
| Plum ink | `#2b2230` | Body text |
| Deep plum | `#2a1a33` | Headings, page-hero gradient start, dark text on light |
| Footer sand | `#efe6da` | Footer background (a touch deeper than sand, with a hairline top border) |
| Brand purple (accent) | `#8a56a0` | Primary buttons, links, labels — unchanged brand colour |
| Accent hover | `#74468a` | Hover state of accent |
| Light violet | `#a678c4` | Gradient end, focus ring |
| Tint wash | `#f1e8f4` | Hover washes, chips, dropdown hover |
| Cream (canvas) | `#faf6f0` | Page background, menu bar |
| Sand (elevated) | `#f3ece2` | Alternating sections |
| Card | `#fffdf9` | Cards, dropdowns, embedded calendars |
| Border | `#e6dccf` | Hairlines only; prefer shadow over borders |
| Muted text | `#5d5361` | Secondary text (6.2:1+ on cream and sand) |
| Dim text | `#736979` | Small meta text only (4.4:1+) |

Rules: one accent (purple) — no second brand colour; warmth comes from the
neutrals, not from new hues. Gradients only plum → purple → light violet, and
only on page-title bands. Never purple text on purple; white text on purple.
All text pairs above meet WCAG 4.5:1 except "dim", which is for small meta only.

## Typography
- **Headings: Cormorant Garamond** (500; 600 for h3), sentence case, tight
  leading (1.02–1.15), deep plum. Self-hosted in `public/fonts/` (OFL licence
  in `LICENSES/`).
- **Text, menu, buttons, labels: Nunito** (Sane Living's existing brand font),
  also self-hosted. Body 17px / 1.75.
- Sizes: h1 `clamp(2.6rem, 6vw, 4.4rem)`; home hero headline up to 5.8rem;
  h2 `clamp(2.1rem, 3.9vw, 3.1rem)`; h3 `clamp(1.4rem, 2.2vw, 1.75rem)`.
- Eyebrow labels: Nunito 12px, 700, uppercase, letter-spacing 0.2em, accent
  colour (white on photos, with a short rule before it on the home hero).
- Numbers/prices: Nunito 700, ink colour.
- No lone last words: headings and short centered intros use `text-wrap: balance`;
  paragraphs use `text-wrap: pretty` (set once at the end of `style.css`).
- Open Sans is still loaded only for a few older pages that use it directly.

## Layout principles
- Max content width 1100px; text blocks 800px.
- 8-point spacing rhythm via the `--space-*` scale; sections breathe:
  `clamp(4.5rem, 9vw, 7rem)` vertical padding, alternating cream / sand.
- Cards: radius 16px, soft warm shadow (`--shadow-soft`), hover lift −4px.
- Images: radius 14–16px, `object-fit: cover`, subtle zoom on hover (1.04).

## Components
- **Menu:** cream bar with a soft blur, Nunito 15.5px links in deep plum, and
  an always-visible purple **Check Availability** pill (→ `/rent/#calendar`).
  On the home page it floats transparently over the opening video with a
  white logo, then turns cream once the visitor scrolls. Phones get a solid
  bar (a blur would trap the slide-out menu panel).
- **Home opening image:** full-screen video, plum gradient overlay (darker at
  top, bottom and left), eyebrow + large serif headline + intro set low and
  left, purple "Rent the Space" pill plus an underlined white text link.
  Headline, intro and main button stay editable in dashboard Settings.
- **Buttons:** pill (999px), Nunito 12.5px uppercase 700, letter-spacing
  0.14em. Primary = purple / white with soft purple shadow; hover deepens and
  lifts 2px. Outline = 1.5px purple border, plum text, fills on hover.
  `.btn-light` = white / plum for use on photos. Visible focus ring always.
- **Page hero (sub-pages):** plum→purple gradient band, large white serif title,
  label as translucent pill. One hero pattern for every sub-page.
- **Event cards / rent cards:** photo top, padded body, date in accent.
- **Calendar embeds:** white card, radius 16, hairline border; legend below.
- **Tables (pricing):** dark ink header row, zebra rows, hover wash.
- **Gallery:** story chapters with mosaic tiles and an on-page photo viewer.
- **Footer (every page):** footer-sand background, plum text, deeper-purple (`#74468a`) small headings. Top band: serif newsletter
  heading with a pill email field and purple Subscribe button. Then four
  columns: white logo (plus optional footer text), Visit (address, hours,
  directions), Contact (phone, email, social) and Explore links; a quiet
  bottom bar with © and a subtle Team Login link. Rendered from Settings by
  `public/site-content.js` (fallback in `public/script.js`); keep the class
  hooks `.mc-signup-footer`, `.footer-links`, `.footer-address`,
  `.footer-contact`, `.footer-hours`, `.footer-social`, `.footer-note`,
  `.footer-copy`. The colourful logo shows as-is. Text on footer sand stays ≥ 5.6:1.

## Motion & accessibility (pre-delivery checklist, from UI UX Pro Max)
- Transitions 150–350ms with a soft ease; respect `prefers-reduced-motion`.
- Text contrast ≥ 4.5:1; focus states always visible.
- No emojis as icons — use SVG or typographic symbols only.
- Check responsive at 375 / 768 / 1024 / 1440 px before calling a page done.

## Don'ts
- No new fonts without updating this file. No stock/AI imagery for the venue —
  only real Sane Living photos. No drop shadows heavier than `--shadow-lift`.
- Don't copy another site's text, images, logos or signature layouts — borrow
  the feel only.

## Staff dashboard and editor workspace (October 22, 2026)

The public marketing rules above remain the venue website's baseline. Dashboard chrome uses the confirmed context in `.impeccable.md`: calm, welcoming, precise, with a readable desktop/phone workflow and a dark editor option.

- Dashboard tokens: `public/dash/workspace.css`; editor tokens: `editor/src/workspace-polish.css`. Keep workspace styles outside the iframe so the canvas remains faithful to the website.
- Keep existing Nunito branding; use regular body weight, 600–700 for controls, and strong page headings. Fixed rem-based UI sizes replace arbitrary tiny text; use tabular numerals for counts and rates.
- Use the shared 4px spacing scale, quiet hairlines, warm neutral surfaces, and restrained plum actions. Group with whitespace and separators; reserve cards for independent editing surfaces and photo frames. No new decorative gradients, accent stripes, heavy shadows or generic icon tiles.
- Fields need visible boundaries, readable values, keyboard focus and full-sized mobile targets. Action hierarchy distinguishes a draft save from publication; error/offline feedback stays persistent where necessary.
- Desktop Home pairs the real venue calendar with task links. Mobile stacks them and keeps navigation scrollable. Settings categories, gallery collection boundaries, source content ownership and staff saves remain intact.
- Floating canvas controls stay compact. Detailed sizing/style controls remain in the inspector; whole sections still move in Layers.

Guidance applied from [ByChokeYT/Impecable](https://github.com/ByChokeYT/Impecable/tree/d0453bffd697f6fdd08e5d5244643d6afadcc7de/source/skills): impeccable context, polish, typeset and adapt. This is an adaptation to the existing product, not an installed skill bundle or copied editor runtime.

### Native dashboard appearance (October 25, 2026)

Paul requested warm Light/Dark themes and restrained liquid-glass styling for the staff dashboard. `public/dash/appearance.css` owns the native dashboard's theme/material roles after `workspace.css`; `appearance.js` applies a browser-only Light/Dark/Auto preference before paint. Subtle static plum/sand lighting and translucent workspace chrome are permitted for this dashboard request. Fields and data stay opaque and readable, with visible borders, focus and status contrast. Keep the public website and Page Editor canvas independent of these styles. See `docs/dashboard/APPEARANCE_AND_NATIVE_PAGES.md` for scope and verification.

## V4 — "Day into night" (rebrand foundation, Oct 29, 2026)

The rebrand positions the venue as downtown Ojai's flexible, walkable, soundproof
space for any hour: meetings and workshops by day, receptions and after-parties
by night. V4 keeps V3's cream, purple and fonts for **day** sections and adds an
**evening** palette. Pages should read like a day turning into night as you scroll.

| Token | Value | Use |
| --- | --- | --- |
| `--clr-night` | `#1f1328` | Evening section background (`.section-night`) |
| `--clr-night-deep` | `#150c1b` | Darkest closing band |
| `--clr-night-raised` | `#2a1a33` | Cards on night, or one "night" card among day cards |
| `--clr-night-line` | `#4a3656` | Borders and dividers on night |
| `--clr-dusk` | `#4a2f58` | The in-between hour (e.g. 7 pm card) |
| `--clr-glow` | `#e9b872` | Candle-glow accent: evening only (headline accents, night buttons) |
| `--clr-on-night` / `--clr-on-night-muted` | `#f3ece2` / `#cbbfd2` | Text on night |

Shared classes in `style.css` (V4 section): `.section-night`, `.eyebrow`, `.glow`,
`.btn-glow`, `.btn-ghost-light`, `.time-tag` / `.time-tag-night`.

Rules of thumb:
- Purple stays the day accent; glow is the night accent. Don't use both in one block.
- Pair day and night photos of the same place where possible.
- Voice: warm, confident, a little insider ("Ojai goes quiet at 9. We don't have to.").
  Daytime use is as important as nighttime; never pitch the venue as only after-hours.
- The home headline's text after the first comma renders in the glow italic.

V4 additions (Oct 29): a faint film-grain texture (`--grain`) sits on every `.section-night`,
and the shared footer is now a night footer (deep plum, glow headings, white logo).
Home page personality pieces: the "Behind the purple doors" story, a fact strip of real
numbers, and sun → moon time markers with a filling day line. Past-event flyers stay on
the Events page. Use only real facts and real event material;
never invented reviews or numbers.
