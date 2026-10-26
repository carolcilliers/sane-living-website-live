# Warm glass dashboard appearance and native-page refinement

## Scope and visual brief

Baseline: `7796d43c72f7066a83d525f7054a4d342e90bf14`. This revision completes the native Events, Photo Gallery, Partners and Settings presentation, and carries the same appearance system through Home, Weddings, Pricing and sign-in. The homepage's actual source and DESIGN.md supplied the visual reference: plum, violet, warm cream, sand, venue photography and familiar Nunito type. Public website HTML/CSS/content and the Page Editor iframe sources are unchanged.

Staff need to read a section, find the relevant fields, make a real edit and understand Save versus Publish. The visual direction is a warm glass workspace around stable, opaque controls. Static ambient plum/sand lighting, a soft highlight edge, restrained translucency, consistent borders and shallow contact shadows give depth. No moving backgrounds, new fonts, generated venue photos, fabricated records, animation runtime or editor replacement are added.

Applied Paul's attached Visual Product Polish playbook, the Portfolio Motion Stories skill's glass/readability/preservation guidance, and OpenDesign's `skills/impeccable-design-polish/SKILL.md`, re-read at `9724c44142ea0afaee3d207f37901b31c66a44ad`. The earlier upstream reference inventory remains in PRESENTATION_POLISH_2026-10-25.md. These are design/workflow references; no upstream engine or artwork is copied or installed. The original code uses native HTML/CSS/JavaScript and the existing test tooling.

## Ownership and appearance behavior

- `workspace.css` retains established layout primitives. New `appearance.css`, loaded last inside `/dash/`, owns the coordinated color/material roles and native-page refinements. Shared roles cover canvas, raised fields, labels, secondary text, accent actions, status colors, borders, focus and glass. Dark appearance uses warm charcoal/plum rather than neutral black. Error/success/warning meanings stay visible in both appearances.
- `appearance.js` runs in the head before paint. The root receives `data-dashboard-theme` and native `color-scheme`. Default **Auto** follows `prefers-color-scheme`; explicit **Light** or **Dark** overrides it. The choice is stored as `sane-dashboard-appearance`, is synchronized through native storage events, and safely falls back when storage is blocked.
- The sidebar's Appearance group uses actual buttons, accessible pressed states, labeled sun/moon icons and full touch targets. It remains available on phones. Switching changes CSS variables/classes only: no form rebuild, source reload, save or publish request occurs. Website settings and team drafts do not contain this browser preference.
- Frosted sidebar, source-status/toolbar/save surfaces enhance browsers with backdrop-filter. Opaque base rules remain the fallback. No nested blur stacks or per-frame blur/shadow work is introduced. On narrow screens the navigation is solid for stable rendering.
- The Page Editor retains its existing independent appearance controls and faithful website canvas. The dashboard rail follows its own selected appearance. Dashboard styles are never loaded into that iframe.

## Native page improvements

**Events:** clear list heading; aligned date, content and action columns; consistent responsive action rows. The event form has named Essentials, Guest Information and Website Visibility groups. Existing field IDs, payloads, Airtable paths, publication control and recovery remain unchanged. Opening the form focuses Title. Programmatic scrolling respects reduced motion.

**Photo Gallery:** consistent image frames and stretching card rows; restrained collection bands; readable status, search, caption and section controls. Existing collection navigation, filtering, bounded paging, uploads, per-photo publication, ordering, deletion and shared drafts remain the sole data pathway. No duplicate gallery schema or content is introduced.

**Partners:** a defined introduction surface and directory heading; consistent-width cards that retain their width even when only one exists, photo-preview frames, live business-name headings and bottom actions. A failed image link has a visible fallback. Typing into photo/name fields updates only that preview/header and the existing record. Add Partner focuses the new Business Name field. Existing descriptions, legacy blurb fallback, consent note and all original fields are preserved.

**Settings:** category rail and field groups share the visual system. Short fields align in two columns when space allows; images, toggles, long text and metadata span the full group. Mobile stacks naturally. Existing category keyboard navigation, disclosure state, Show/Collapse All, uploads, menu reordering, draft/revert/publish and SHA conflict handling remain intact.

Home keeps its permanently visible calendar. Weddings and Pricing keep the preceding structural and photo-workflow improvements, now with matching colors in both appearances. The login page uses the same warm surfaces and readable fields.

## Verification evidence

All write tests use isolated GitHub/Airtable fixtures and temporary built-site copies. No real event or authored website content is modified for QA.

- `dashboard-presentation.cjs`: all seven native pages and all eight Settings categories, 320/390/768/1024/1440/1920px; 200% text at 390/1024px; field/control bounds, full-sized targets, keyboard/focus, compact changed-state save bars, retained edits, reduced motion, editor host and login. Ran in both explicit Light and Dark, with axe WCAG A/AA checks. Set `DASHBOARD_THEME=dark` for the dark pass.
- `dashboard-appearance.cjs`: Light/Dark/Auto, persistence across reload, live system changes, real cross-tab storage updates, storage-blocked fallback, and input-node identity/private edit preservation across theme changes. Appearance-only operations make zero repository writes.
- The same test walks Partner create/edit/preview/remove, exact complete-object shared drafts, recovery and publication; event create/edit/publish/unpublish/delete; retained gallery captions; themed edit forms and image picker. It checks phone/tablet/laptop/desktop sizes and axe in the added editing states. The fixture's event endpoint now implements DELETE so deletion can be checked against the subsequent data response.
- Existing `studio-flow`, `studio-settings`, `dashboard-organization`, `dashboard-editorial`, `source-sync`, `workspace-polish` and `content-api` regressions protect recovery, uploads, failed/in-flight saves, publication, stale writes, the visible calendar, large galleries and external-source synchronization. TypeScript and the production build pass.
- Rendered screenshots were inspected for light/dark Events, expanded event forms, Gallery, Partner cards, Settings and mobile layouts. Automated accessibility checks supplement visual and keyboard review; they are not an accessibility certification or physical-device testing claim.

`npm run test:dashboard` includes the new appearance/workflow test. Optional `AXE_CORE_PATH` enables axe, and `DASHBOARD_QA_DIR` stores local QA screenshots. These are development tools, not production dependencies.

Before release, compare the current main to the inspected baseline for overlapping files. Publish one expected-head, non-force commit. Verify Vercel success and exact deployed dashboard assets against the tested files. Only dashboard presentation, tests and these notes are in the release manifest.
