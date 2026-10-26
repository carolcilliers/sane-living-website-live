# Verification, handoff and release

Work from a fresh main snapshot or isolated local copy; inspect AGENTS.md/CLAUDE.md and preserve other contributors. Before publication, compare current remote versions of every owned file. Build a tree on the current remote tree and update main with force=false and expected head. On mismatch, read the new head and resolve actual overlaps; never force through a teammate's commit. One reviewed batch avoids unnecessary deployments.

Relevant commands: `npm run typecheck`, `npm test`, `npm run build`. Browser tests use Playwright and CHROMIUM_EXECUTABLE_PATH. AXE_CORE_PATH enables accessibility audits; DASHBOARD_QA_DIR stores intermediate screenshots. `npm run dev:editor` is fixture-backed; `npm run dev` is only static serving and does not make production API credentials available.

New checks: tests/events-planner-api.cjs exercises actual staff/public handlers against a mocked Airtable service and isolated GitHub adapter; tests/events-planner-flow.cjs covers the Home shortcut, disconnected/shared drafts, linking, uploads, actual decoded preview video frames, publication, public modal media, archive imports, independent photo expansion, Home alignment, logo and wedding bridge. Existing content, studio, dashboard, source-sync and editor checks remain relevant.

Test both themes and 320/390/768/1024/1440/1920px as applicable, 200% text, keyboard/focus, failed requests, stale writes, recovery and data preservation. A screenshot or element count alone does not verify publication or playback. Never loosen a safety assertion to make a test pass; update UI-specific expectations only when intentional behavior changed.

Verify the exact commit's Vercel success, then compare live dashboard HTML/JS/CSS with tested bytes. Perform read-only live loading checks. Do not label fixture writes as production Airtable verification. Record any failing historical editor checks separately and investigate their baseline before claiming the full suite passes.

## Recorded baseline limitation for this release

The full npm test chain reaches the older editor element-model test and fails because it looks up an image with the exact legacy label `Conference Room`; the redesigned homepage no longer has that label. The same failure was reproduced in the preceding dashboard checkout before these planner changes. No editor/source-image behavior was changed to satisfy this stale selector. The editor publication browser test's Gallery assertions were updated to the current collection summary and 12-photo pagination; data/publication assertions remain intact. Report the complete legacy suite as not green until its source-specific selector is maintained; do not describe it as a passing full suite.
