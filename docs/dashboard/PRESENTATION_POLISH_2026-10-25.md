# Dashboard presentation polish — October 25, 2026

The current organization pass is described in [Dashboard organization and progressive disclosure](DASHBOARD_ORGANIZATION.md). It replaces the Home menu-copy grid with a real status overview and adds bounded gallery browsing and contextual Settings groups.

## Scope and preservation

Use Paul's attached **Visual Product Polish — Skill & Tool Playbook** as the implementation and verification workflow. This pass changes only the staff dashboard presentation: public/dash/workspace.css, its HTML font reference, and presentation markup in public/dash/app.js. No public website page, canonical content file, API, permission, event/calendar integration, publication logic, editor model or website canvas is changed. Existing authored website values, media paths, destinations and data bindings remain intact. Dashboard guidance and grouping may change to make the workflow clearer. Website content remains unchanged.

Page Editor retains its existing dark/light authoring interface and website rendering; its containing dashboard navigation receives the same presentation system. Do not load workspace.css into the canvas.

## Improvement brief

- **Visitor:** Sane Living staff with mixed technical experience, working on phones, laptops and desktop screens.
- **Input → action → result:** existing content fields → the existing Save draft or Publish action → existing saved/draft/live feedback. No illustrated or simulated workflow replaces a real operation.
- **Direction:** a calm, warm venue workspace. Cream #faf6f0, sand #f3ece2, white cards #fffdf9, plum #2b2230 and Sane Living purple #8a56a0. Retain Nunito; serve the existing font locally.
- **Hierarchy:** a light Sane Living navigation rail with a solid plum active state; distinct page-header surfaces; Home metric cards, actionable content status and published website details; four Weddings editing sections; separate rate and booking surfaces; searchable, paginated collections with compact photo cards and expandable descriptions; and a desktop Settings category rail. Existing SVGs are reused for Home task/metric context, with no generated artwork or icon dependency.
- **Motion:** only short colour/border feedback. No entrances, loops, 3D scenes, scroll effects or new animation engine.
- **Touch / keyboard:** at least 44px primary controls; native keyboard-focusable file inputs, persistent captions and photo-description labels, explicit partner/rate/highlight input names, visible focus rings and Settings arrow-key navigation in both horizontal and vertical orientations.
- **Responsive:** fluid cards, grid tracks that can shrink, naturally stacked forms, a dedicated category rail at 1100px and above, stacked Settings categories below that width, and per-session rate cards on phones. Keep DOM and keyboard order unchanged.

## Defects corrected

The external-update status previously started behind the fixed sidebar. It now aligns with the dashboard content and wraps normally. The initial save bar previously covered form content even without edits; it now stays in normal flow until there is unpublished work, when compact sticky actions remain available. Gallery placeholders are supplemented with persistent labels. Prices no longer depend on tiny, crowded table cells on phones. Dirty-state badges have sufficient text contrast. The light sidebar has space for labels and saved-state badges; the existing dark editor context remains readable when entering and leaving it. Navigation theme colours change immediately instead of briefly showing low-contrast intermediate colours. Public fonts no longer depend on Google Fonts loading. Dashboard HTML uses explicit presentation asset versions so a reload fetches the matching markup and stylesheet.

The existing base and functional CSS remains intact. workspace.css is the coherent visual owner; source ownership and backend save/publication paths remain intact; view state is separate from content.

## Source register

References were resolved to a commit before inspection. Guidance review is not runtime integration. No upstream code, artwork, spring solver, marketing animation, generated media, PHP plugin, movie or 3D scene was copied into the dashboard.

| Reference | Commit read | Use in this pass |
| --- | --- | --- |
| nexu-io/open-design | `9724c44142ea0afaee3d207f37901b31c66a44ad` | Applied UI-animation, choreography and Impeccable polish guidance; design-review/UI-skills catalogue entries reviewed. |
| latent-spaces/brag | `669ab9286aa28b6c3ee30e75f181ee74319d012a` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| singhharsh1708/scrollcraft | `f74983396902df8feeed23a99ab6c50d320445a8` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| ProXEQ/scrollcrafter-legacy | `af3cdcdf09fe13558fc7ab0e1cb70f437561a7c7` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| CosmicMind/Motion | `808ac0cf1b67c5e4163ee867dd6c056836fcbc58` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| koenbok/Framer | `477b95a8433522620c553d147cea109d5213bacd` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| davo/awesome-react-framer-x | `090f197c7acc8c707b2f8c671933be99962a62e7` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| goabstract/Awesome-Design-Tools | `dc60e63c248c44acb42f09fb0c985b77b5fe4bf5` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| tengbao/vanta | `f8b351906688b56f0fc744e53bde81fc3c56f150` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| adrianhajdin/project_3D_developer_portfolio | `9985e4bf4ce35dfbc0b3c0e90d4d37dc3c67b2d7` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| fireship-io/threejs-scroll-animation-demo | `21f4c09c940fac0013ac1f27ee7379a1bf3ae0c8` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |
| akashrmalhotra/3d-portfolio | `2209ef0bb117160deb2ac7b35472e538e71b977b` | README reviewed; outside the restrained dashboard presentation scope. No runtime integration or source port. |

OpenDesign files read: skills/design-review/SKILL.md, skills/ui-animation/SKILL.md, skills/ui-animation/references/choreography.md, skills/impeccable-design-polish/SKILL.md and skills/ui-skills/SKILL.md. Catalogue entries were treated as discovery pointers, not as installed upstream bundles. Useful guidance applied: inspect before changing, use a coherent type/spacing/control system, stable interaction targets, immediate frequent actions, explicit CSS transitions and reduced-motion support. Other reviewed sources concern films, scroll narratives, native iOS motion, resource discovery or 3D portfolio scenes; those would add distraction and dependencies outside this task.

## Verification

Browser checks use isolated GitHub/Airtable fixtures, never production content writes.

- Preservation is checked through the existing save/conflict regressions and the whole-gallery equality assertions in dashboard-organization.cjs. Dashboard copy and grouping can change by authorization; public website content, source data and field bindings remain intact.
- tests/dashboard-presentation.cjs: all dashboard sections and all eight Settings categories at 320, 390, 768, 1024, 1440 and 1920 CSS pixels. Check real control bounds, horizontal overflow, field sizes and primary touch targets.
- 200% text sizing at 390 and 1024px; keyboard tab/category navigation, focus ring, keyboard-reachable native uploads, retained private edits, compact changed-state save bar and an unobscured focused field.
- axe WCAG A/AA checks across dashboard pages and all Settings categories, including dirty navigation badges and an added fixture partner card.
- Page Editor host and visible dashboard navigation at 390/1024/1440px; login at 320px; reduced-motion feedback.
- Existing content-api, studio-flow, studio-settings and source-sync regressions; typecheck and full production build. Auth, shared drafts, conflicts, error/retry, uploads, publication and external source synchronization retain their existing behavior.
- Visually inspect screenshots of real rendered Home, Gallery, Weddings, Rates, Partners and Settings surfaces. Automated checks supplement visual/keyboard review; they are not an accessibility certification or a claim of physical-device testing.

Run the new test with the existing Playwright dependency and an available Chromium:
```bash
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/dashboard-presentation.cjs
```
Whole-gallery preservation under pagination/search is verified by dashboard-organization.cjs. Set AXE_CORE_PATH to an axe-core/axe.min.js file for the accessibility pass, and DASHBOARD_QA_DIR for local screenshots. axe and temporary browser installation are QA tools, not added production dependencies.

## Release boundary

Inspect the latest main before writing; preserve other contributors' code and content. Push one reviewed batch with a non-forced expected-head check. Verify Vercel status and exact live dashboard HTML, CSS and JavaScript against the tested files before calling the release live. The frontend and editor bundle are outside this diff.
