# Verification, handoff and release

Work from a fresh main snapshot or isolated local copy; inspect AGENTS.md/CLAUDE.md and preserve other contributors. Before publication, compare current remote versions of every owned file. Build a tree on the current remote tree and update main with force=false and expected head. On mismatch, read the new head and resolve actual overlaps; never force through a teammate's commit. One reviewed batch avoids unnecessary deployments.

Relevant commands: `npm run typecheck`, `npm test`, `npm run build`. Browser tests use Playwright and CHROMIUM_EXECUTABLE_PATH. AXE_CORE_PATH enables accessibility audits; DASHBOARD_QA_DIR stores intermediate screenshots. `npm run dev:editor` is fixture-backed; `npm run dev` is only static serving and does not make production API credentials available.

New checks: tests/events-planner-api.cjs exercises actual staff/public handlers against a mocked Airtable service and isolated GitHub adapter; tests/events-planner-flow.cjs covers the Home shortcut, disconnected/shared drafts, linking, uploads, actual decoded preview video frames, publication, public modal media, archive imports, independent photo expansion, Home alignment, logo and wedding bridge. Existing content, studio, dashboard, source-sync and editor checks remain relevant.

Test both themes and 320/390/768/1024/1440/1920px as applicable, 200% text, keyboard/focus, failed requests, stale writes, recovery and data preservation. A screenshot or element count alone does not verify publication or playback. Never loosen a safety assertion to make a test pass; update UI-specific expectations only when intentional behavior changed.

Verify the exact commit's Vercel success, then compare live dashboard HTML/JS/CSS with tested bytes. Perform read-only live loading checks. Do not label fixture writes as production Airtable verification. Record any failing historical editor checks separately and investigate their baseline before claiming the full suite passes.

## Source-aware editor regression coverage

The October 26 audit updated old source-specific test assumptions after the frontend redesign: image descriptions, the primary CTA, actual card/photo wrappers and heading fields, and the Find Us insertion target. It retains source-field identity, whole-frame dragging, precise insertion, repair/Undo, geometry and publication assertions. Tests now wait for the intended route and source-sync readiness, select covered background video through Layers, and compare pinned toolbar coordinates inside the canvas. An exact inverse-motion check starts with valid source bounds and explicitly disables snapping; snapping and all eight resize handles remain separately exercised.

The audit also exposed a real column-resize defect in a flex context: new fractional tracks could increase the row's intrinsic width. The completed gesture now preserves the measured row width in that device's validated style override. The regression checks both neighboring tracks and the unchanged total row width. See the dated dashboard audit for page coverage, commands, the production Airtable limitation and test boundaries.
