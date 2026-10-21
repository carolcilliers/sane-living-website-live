# About editor pilot — implementation status

Implemented scope: E01–E03, integrated in the dashboard after the owner requested the new page. This report supersedes historical “not implemented” statements in the original planning snapshot. It does not mark the private-backend or publication stages complete.

## User-facing behavior

The dashboard has a lazy-loaded **Page Editor** panel before About and Settings. Settings remains last. The editor reads a published About copy through the existing authenticated content API. It provides section selection, mouse and keyboard drag sorting, move buttons, text/Markdown formatting, image/link fields, supported layout variants, visibility, add/duplicate/remove, grouped undo/redo, browser recovery, portable draft import/export and full-width preview modes.

This is a working **About pilot**, not a whole-site visual editor. Its Publish action is explicitly disabled. Browser recovery is not a private team save. Drafts are cleared on logout, and users can download a portable copy. No new-editor action sends a content mutation request, uploads media or publishes user content. The existing About Page and Settings workflows remain available and unchanged.

An incompatible recovery is retained until explicitly replaced. Conditional browser-storage writes also avoid silently replacing another tab's newer recovery. Failed storage writes produce a persistent error and leave download available. Source load/authentication failures do not become empty editable pages.

## Architecture

| Layer | Implemented location |
| --- | --- |
| Isolated React UI | `editor/src/` inside a dashboard iframe, loaded only on opening Page Editor |
| Content adapter/validation | `public/editor-model.js`, shared Node entry `content-core/about.cjs` |
| Shared About rendering | `public/about-renderer.js`, Node entry `content-renderer/about.cjs` |
| Existing route owner | `scripts/build-content.cjs` remains responsible for the public About output |
| Browser preview | Shared renderer + trusted existing template, sandbox without scripts/forms; escaped user content |
| Local development harness | `scripts/dev-editor.cjs` uses isolated in-memory Git/API fixtures |
| Compiled UI | `public/dash/editor/`, generated during build/tests, ignored by Git |

The adapter assigns stable IDs and a founder attachment key to the working copy only. It does not migrate the published About source. Unknown frontmatter/section fields, hidden sections and the Markdown suffix survive export/import. Page structure/bindings are fixed to the supported About pilot contract; arbitrary imported components/paths are rejected.

Preview and build use the same section renderer. Only the preview adds selection annotations and removes interaction/scripts. Real iframe viewport widths remain unchanged when the viewport is scaled to fit. This preserves responsive CSS behavior; it is not a narrow `<div>` masquerading as a device viewport.

The legacy render function was extracted without changing existing marketing output. New supported fields are optional and affect only working-copy previews until a future authorized content migration. No current content file, rewrite/redirect, Airtable function or public page markup was changed for this pilot.

## Upstream provenance / core decision

`editor/src/Layers.tsx` adapts the sortable-row/sensor structure of OpenPage's `src/editor/LayersPanel.tsx` at commit `9818eb43a88e01b23cb55752e19902d8285a853b`, copyright 2026 Federico De Ponte, MIT. The license is retained in `LICENSES/OpenPage.txt`.

Modifications: remove project store, toast, icon catalogue, generic block registry and add-component orchestration; accept Sane Living section IDs/props/callbacks; expose keyboard move controls; use semantic buttons and the local About adapter; restyle for the current dashboard. The remaining UI/core/renderer is project-specific integration code. No other upstream application or media/template collection was copied.

Retain this small OpenPage-derived sorting slice. The broader upstream dashboard/store/deployment/export implementations are not adopted. React + dnd-kit are isolated from existing vanilla dashboard code; there is no Next.js/Clerk/Prisma/WordPress migration. The compiled editor bundle is approximately 83 KB gzip plus 3.2 KB gzip CSS, and is not loaded on public marketing pages or before opening Page Editor.

## Verification evidence

- `npm run typecheck` passes.
- `npm ci --ignore-scripts` and `npm run build` succeed from the lockfile.
- Existing content API and browser suites continue to pass: dashboard sections at 375/768/1024/1440, recovery, draft/publish, settings/media/metadata, stale writes and event form recovery.
- New contract tests cover unknown metadata/suffix preservation, stable IDs, hidden content, founder attachment, unsupported bindings/version/layout and unsafe URL rejection.
- New browser tests cover lazy mounting, editing, pointer/keyboard sorting, undo/redo, refresh recovery, portable import/export, storage failure, incompatible recovery preservation, actual iframe viewport width, mobile overflow, old form isolation, disabled mutation paths and logout cleanup.
- New-editor browser flow records no content-write requests and zero fake repository commits.
- An isolated comparison renders the baseline and extracted renderer and verifies **all 25 marketing HTML outputs are byte-identical**.
- Local `npm run dev:editor` was exercised in a browser through fixture authentication, actual content handlers, Vite proxy and shared rendering.
- `npm audit --omit=dev` reports zero production dependency advisories at verification time. This is not a full security audit.

No production staff credential was requested or used. No real Airtable event/form mutation was performed. Deployed authenticated use still depends on the site's existing staff session/runtime configuration.

## Gates / remaining work

| Gate | Status |
| --- | --- |
| G0 source/route baseline | Complete, known Airtable/Vercel management gaps retained |
| G1 local core/adapter/rendering proof | Passed for the implemented About scope |
| G2 private team authoring | Not implemented; provider/identity decisions remain |
| G3 verified publication/restore | Not implemented; new-editor publishing remains unavailable |
| G4 production page-source cutover | Not performed; public routes keep existing ownership |
| G5 wider site rollout | Not started |

The owner's request authorized deploying the dashboard pilot UI; it did not configure missing private storage or change the plan's publication invariants. Do not wire this pilot directly to the old public-repository draft API as a shortcut to G2/G3. The next work packages are E04–E08 after provider/identity decisions, then E09–E12 for publication, restoration and actual About source cutover. Re-estimate those packages after selecting the concrete services; no zero-regression guarantee is claimed.

## Run / rollback

Install dependencies with `npm ci`. Install a normal Playwright Chromium browser with `npx playwright install chromium` or set `CHROMIUM_EXECUTABLE_PATH` for an existing executable. Run `npm run typecheck`, `npm test`, `npm run build`. Start the local fixture-only editor with `npm run dev:editor` and open the printed `/dash/editor/` URL. It binds to loopback and uses test-only credentials/data; it makes no real service writes.

To disable the new UI, remove/hide its sidebar entry and lazy frame mount. To undo the implementation, restore this change as a normal Git commit; no content migration, database migration or route reset is needed. Retain the shared renderer entry or restore its original inline build code together—never remove the module while leaving the build dependent on it.

