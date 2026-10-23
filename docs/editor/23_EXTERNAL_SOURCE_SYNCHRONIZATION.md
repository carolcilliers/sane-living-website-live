# External source synchronization

The dashboard supports a mixed workflow: team members can edit in the dashboard while other contributors push website code, content and images to GitHub. Background checks are read-only. They never publish, import images into a gallery automatically, or write a GitHub commit.

## What refreshes

Visible dashboard and editor sessions check the current GitHub main revision every 30 seconds and when the window regains focus. Updates wait until the deployment reports that same commit. A failed or still-building deployment leaves the current session intact. Requests use no-store; dashboard content reads are pinned to the checked commit.

Clean dashboard content sections reload when their published or shared-draft versions change. Active fields, uploads and unpublished changes defer replacement. Local edits stay visible, with a notice to reconcile the external version. Same-path image replacements receive a revision query so cached thumbnails can refresh without changing stored image URLs.

A clean editor persists its new baseline in private storage using the existing revision check, then reloads only its iframe. This loads updated source, editor code and presentation assets together, preserving the outer dashboard and selected page. Privately saved unpublished designs count as unpublished work: saving a draft does not authorize replacing it with remote content. Conflicting source versions retain the original draft baseline and existing publish guards. Draft tools remain the explicit reconciliation path.

Repository images inside `public/` (excluding dashboard and vendor assets) appear in **Choose existing website image**, including files uploaded through another AI assistant. Selecting an image changes the current draft only. An uploaded file does not silently become a published gallery entry. Gallery membership/captions still come from the canonical gallery content. New image files with no manifest change therefore appear in the editor library, not as invented gallery records.

## External contributor requirements

- Keep current page registry routes, editable bindings and canonical content contracts intact.
- For an inactive editor page whose raw HTML changes, run `node scripts/capture-page-template.cjs PAGE_ID` and commit its matching template snapshot with the source change.
- Active editor-owned pages need the documented explicit migration; do not bypass source/template mismatch guards. A new page needs a registry entry before the editor can expose it.
- Preserve the server's current-head and resource-SHA checks when publishing. Fetch the latest main before making an atomic non-forced write. Never overwrite someone else's concurrent commit.
- Do not remove authentication or deployment protection to improve freshness. Source checks use the existing signed-in dashboard session.

## Failure and recovery

Deployment lag, GitHub errors and template incompatibility show a waiting/paused notice. Initial editor load retries transient failures. Neither a failed check nor a new remote revision erases a draft. If unpublished work is present, review the update notice, save/download a backup through Draft tools, and reconcile before loading the new design. There is no automatic merge of conflicting layout designs.

## Verification

`tests/source-sync.cjs` uses the actual API handlers and a browser with simulated external GitHub commits. It covers deployment gating, clean gallery refresh, protected local gallery edits, editor iframe refresh without replacing the outer dashboard, preservation of privately saved unpublished designs, discovery/selection of an externally uploaded image, and absence of background publication commits. Existing publisher, storage recovery, insertion, movement and responsive editor tests remain release checks.

Verification note (2026-10-23): the synchronization scenario, build, typecheck, content API, publisher, private/team draft recovery, dashboard settings, smooth-canvas, image removal, responsive workspace, layout/background and component checks passed. The existing homepage toolbar/insertion fixtures use old image alt text or hardcoded element IDs removed by the concurrent redesign. The canvas-tool-paths movement round-trip assertion also fails with the pre-synchronization editor source against the same redesigned homepage. Those authoring regressions/fixture updates are separate follow-up work; this change does not claim full editor acceptance.
