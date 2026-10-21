# Website editor — implementation status

Current correction: October 21, 2026. This supersedes the earlier UI-only pilot report. E01–E03 remain the implemented foundation; G2–G4 private authoring and verified releases are not complete.

## What team members can do

Open **Page Editor** before About and Settings. Settings remains last. The editor loads only when selected.

- Edit the existing About source: select sections on the real page or in Layers, edit text/images/links/layout, show/hide sections, add/duplicate/remove, reorder with mouse or keyboard, and undo/redo.
- See edits immediately on the current website scaffold, including its real logo, navigation, fonts, header, footer and settings. Animation-dependent content is made visible in the canvas.
- Preview at real iframe widths of 375, 768, 1024 and 1440 CSS pixels, scaled to fit. Preview hides the inspector; Full screen expands the workspace.
- Browse the current Home, Rent, Weddings, Gallery, Events and Contact pages. These are clearly labeled preview-only; About is the supported visual editing scope.
- Save browser recovery explicitly or automatically, recover after refresh, and download/import portable JSON drafts. Browser recovery is local and cleared on logout.
- Choose **Review & publish →** to transfer an About snapshot into the existing About form. The dashboard re-reads published About first and rejects a stale source. A confirmation protects an existing About working copy/shared draft. Transfer itself performs no write. The existing **Save draft** and **Publish changes** actions remain explicit subsequent steps.

The editor is a structured section editor, not a free-positioning Framer clone or a whole-site migration. Unconverted pages are preview-only. The target private editor draft store, individual identities and atomic release/restore service are still future work. The existing shared-team About workflow keeps its existing public-repository draft storage semantics; this transfer does not claim to satisfy private authoring gates.

## Corrections prompted by the first pilot

The first preview stripped the scripts responsible for header/footer injection and failed to reveal stagger-animated children. Its oversized introductory area and nested scrolling made the usable canvas too small. A disabled Publish button also left no useful next action.

The corrected workspace has a compact header/toolbar, page picker, readable fields, independently scrolling panels, one page scrollbar in the canvas, an expanded Preview mode and Full screen. Status notices do not cover the draft buttons and dismiss automatically. Review/publish has an acknowledged, version-checked handoff instead of an inert primary action.

## Data and rendering boundaries

| Layer | Location / behavior |
| --- | --- |
| Isolated React UI | `editor/src/`, lazy dashboard iframe |
| Adapter/validation | `public/editor-model.js`; shared Node entry `content-core/about.cjs` |
| About renderer | `public/about-renderer.js`; shared Node entry `content-renderer/about.cjs` |
| Route owner | Existing `scripts/build-content.cjs`; no route cutover or duplicate output |
| Canvas | Allowlisted same-origin public pages; existing trusted website scripts load their current chrome/settings |
| Draft overlay | Only the escaped, URL-validated canonical About renderer replaces the managed region; no arbitrary HTML/code import |
| Review bridge | `public/dash/app.js`; checks exact iframe source/origin, payload size/type, content validation and a fresh published SHA |
| Publishing | Existing About form, existing authenticated content API and revision checks; no new editor publication endpoint |
| Development | `scripts/dev-editor.cjs`, fixture server and Vite proxies; no real service writes |

Canvas loading never becomes an empty editable page. The frame is hidden until interaction guards are installed. Its sandbox permits only same-origin and existing page scripts, with no forms/popups/top-navigation permission. Capture handlers block navigation/submissions, and embedded forms/media are replaced with explicit preview-only placeholders. The scripts are trusted existing public-site code, not user-authored code; allowing both scripts and same-origin is deliberately not treated as an isolation boundary for untrusted code. Do not broaden the allowlisted pages or add user scripts.

About updates replace only the marker-bounded managed region, preserve page scroll during typing, retain attached philosophy content and use the same renderer as the build. Selection changes scroll to the corresponding section. Local draft IDs, founder attachment, unknown metadata, hidden sections and Markdown suffix survive round trips.

A failed or timed-out transfer leaves the visual recovery intact. A fresh source mismatch blocks transfer; a subsequent change after transfer is still rejected by the existing save API's expected SHA. The bridge never auto-saves or auto-publishes. It opens the canonical form rather than creating a second writer or bypassing the planned private-authoring gate.

## Upstream provenance

`editor/src/Layers.tsx` retains the small OpenPage-derived sortable-row/sensor slice from `src/editor/LayersPanel.tsx` at `9818eb43a88e01b23cb55752e19902d8285a853b`, copyright 2026 Federico De Ponte, MIT. Notice: `LICENSES/OpenPage.txt`. Project store, generic registry, upstream auth/deployment/export and media/template collections are not adopted. React and dnd-kit remain isolated from the vanilla dashboard.

## Verification

The correction is checked with `npm run typecheck`, `npm test`, and `npm run build`. Browser tests exercise actual content handlers with in-memory Git fixtures: edit → browser recovery → transfer → shared draft → publish → rebuilt About page. They also cover current header/footer, visible philosophy cards, preview-only page browsing, blocked canvas navigation, responsive iframe widths, mouse/keyboard sorting, import/export, storage failures, stale transfers, authentication failures and logout. Existing API/dashboard/settings suites remain required.

No production staff password is used. Fixture publication is not evidence of an authenticated production save or a Vercel release-verification service. The deployed bundle and Git-linked deployment are checked separately. The previously observed Airtable configuration gap and Vercel management team-grant restriction remain outside this UI correction.

## Gates

| Gate | Status |
| --- | --- |
| G0 source/route baseline | Preserved |
| G1 About core/adapter/rendering | Implemented and regression-tested |
| G2 private team authoring | Not implemented |
| G3 verified publication/restore service | Not implemented; existing About workflow remains the publisher |
| G4 production source cutover | Not performed |
| G5 whole-site visual editing | Not implemented; other listed pages are previews |

## Run and rollback

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Install Playwright Chromium or set `CHROMIUM_EXECUTABLE_PATH`. `npm run dev:editor` is fixture-backed and binds to loopback. Compiled `public/dash/editor/` and QA screenshots remain ignored by Git.

To disable, hide the Page Editor navigation entry and lazy mount. Revert this correction as a normal commit to return to the first pilot. There is no content/schema/database migration to undo. Keep the shared renderer with its build consumer. Preserve existing routes, content files, integrations and Settings-last ordering.
