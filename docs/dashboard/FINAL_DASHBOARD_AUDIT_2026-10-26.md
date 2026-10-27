# Dashboard release audit — October 26, 2026

Baseline: `fce5127b18fd681f7694b804234903e7b7829840` on `carolcilliers/sane-living-website-live/main`. Scope: staff dashboard presentation and verification, event artwork, and a narrowly identified editor grid-resize fix. Public page HTML, brand content, source captures, canonical JSON, active layouts and Vercel configuration were not edited.

## Resulting changes

- Events: prominent, uncropped poster areas for calendar entries and archive stories; linked working-story artwork, gallery fallback, Airtable string/object image support, readable missing/failed-image states, live preview updates and properly associated filter labels. Original archive records have an accurate Original archive badge. Long collapsed introductions are clamped visually; complete text remains in the editor.
- Settings: a light checkerboard backing makes the dark logo legible in dark mode.
- Dashboard/editor boundary: native notifications move away from the editor header, leaving Save/Preview/Publish readable.
- Editor: resizing a column in an intrinsically sized flex context preserves the measured row width while redistributing neighboring tracks. The stored row width is device-scoped, bounded by a 100% maximum, validated, undoable and resettable.
- Regression maintenance: source selectors and invariants follow the redesigned homepage, without restoring obsolete public markup or captions. Source-sync and page transitions use explicit readiness checks. Covered video is selected through its real Layers control. Exact inverse motion is tested from valid bounds with snapping explicitly off; snapping remains separately checked.

## Page and workflow coverage

| Page | Exercised paths |
| --- | --- |
| Login / session | Actual handler: correct/incorrect credentials, secure signed cookie, authenticated status, tampered cookie, logout, unsupported method, missing configuration; browser form/layout |
| Home | Visible monthly calendar, month/day controls, selected-day planning, quick add/edit routing, connection states, published settings snapshot, attention links and card alignment |
| Events | Calendar CRUD/visibility in fixtures, search/period/kind/pagination, archive disclosures, story/host fields, poster/gallery uploads, decoded video playback, planning recovery, consent/link validation, approved-only publication, poster precedence and image failure recovery |
| Gallery | 100+ records, bounded pages, collection boundaries, search/filter, safe same-collection reorder, fixed in-card forms, per-photo visibility and save, full-size viewing, independent sibling edits, retry/reload/conflict protection and publication |
| Weddings | All four original venue sections, photo choose/upload/failure/restore, collection link, draft/reload/publication and the separate wedding-story bridge |
| Pricing | Every session/day rate, detail and booking field; draft/reload/publication and resulting public rates |
| Partners | Introduction and partner create/edit/remove, image preview, draft/reload/publication |
| Settings | All eight categories, show/collapse groups, labelled fields, uploads, logo/favicon, contact/social, homepage, booking, newsletter, announcement, metadata, navigation, validation, recovery and canonical publication |
| Page Editor / About | All 25 routes; actual selection/appropriate inspectors for 1,021 original elements; separate capability inventory for 1,063 elements and 24 inserts; direct button/video/media editing, nested layouts/insertion, source-card movement/repair, eight-way resize, alignment/snap/reset, column redistribution, device isolation, private/team-draft fixture recovery, immutable preview and reviewed atomic publication |

## Verification evidence and boundaries

Checks were run in stages. The initial `npm test` exposed legacy source assumptions; those test cases were maintained and the affected files rerun. The report records staged verification, rather than claiming an uninterrupted single invocation of the original command.

- Content API, studio flow and studio settings stages: authentication, uploads, persisted shared drafts, failed/in-flight saves, stale writes, canonical public output and metadata.
- Native dashboard suites: presentation, organization, editorial forms, appearance, planner API/flow, photo panel and photo quick controls.
- Added `tests/dashboard-event-images.cjs` and `tests/dashboard-login.cjs`.
- All files enumerated by `test:editor` were exercised, including source synchronization, private recovery, toolbar interactions, card movement, exact insertion, geometry, component controls and the all-route element-selection audit. Layout-related checks were rerun after the row-width fix.
- Native layout checks at 320, 390, 768, 1024, 1440 and 1920px; 200% text at phone/laptop widths; editor at 375/768/1024/1440px. Light/Dark/Auto, hot theme switching, reduced motion, focus and WCAG A/AA axe checks were exercised. Phone/desktop renders of every native page and the editor were visually inspected.
- TypeScript, production build and `git diff --check`.

All mutation tests use temporary site copies and isolated GitHub/Airtable adapters. Their real handler/browser flows do not write real venue records or publish test designs to main. Real MP4/WebM/PNG handling, URL safety, stale revision rejection and recovery assertions remain intact. No upstream editor feature-parity claim is made.

## Production prerequisite

A read-only live check returned HTTP 200 for `/dash/`, but `/api/calendar-events` returned HTTP 500 with `Airtable configuration missing`. Planning/shared event stories work independently. Real calendar writes, real Airtable field permissions and synchronization cannot be accepted as production-verified until the owner configures the existing connection and performs the documented setup checks. Optional private team-storage credentials were not provisioned by this audit. Fixture success is not evidence that those production services are configured.

## Repeating the checks

Install the pinned dependencies and a compatible Playwright Chromium. Set `CHROMIUM_EXECUTABLE_PATH` if using an external binary. Set `AXE_CORE_PATH` to axe-core's local `axe.min.js` for the accessibility assertions, and `DASHBOARD_QA_DIR` to an existing output directory for screenshots.

```sh
npm run typecheck
npm run build
npm test
```

Focused additions can be run with `node tests/dashboard-event-images.cjs`, `node tests/dashboard-login.cjs` and `node tests/canvas-tool-paths.cjs`. Keep all fixtures isolated from production. Release with one non-force expected-head main update, verify Vercel success and compare the deployed native assets/editor bundle before reporting the release live.
