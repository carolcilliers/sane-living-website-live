# Photo collections and focused editing

## Entry and ownership

Dashboard route: `/dash/#gallery`. Implementation: public/dash/app.js: renderGallery, bindGallery, groupsHtml, photoCard.

Data: public/content/gallery.json; shared gallery draft; photos array with image/caption/alt/section/group/draft.

## Working rules

Venue, Weddings and Outdoor collections retain their keys. Search/status filters and 12-photo pages preserve original global indices. Reorder within a collection, and disable ambiguous filtered ordering. Open one photo editor at a time. Each editor is an in-card page contained by the same 450px card frame. The heading and Save photo footer stay visible; only its form body scrolls. Opening, closing and internal scrolling never expand the card, stretch neighboring images or change grid geometry. The card summary toggles the form; Close and Escape restore the same card overview and keyboard focus. Navigation and the rest of the gallery remain available. Keep warm Light/Dark colors, aligned full-width fields, clearly described text/placement/organize sections, and stable card dimensions.

Save photo saves only the selected photo's current record to the shared gallery draft. It does not publish, commit unrelated unsaved photo edits, or save unsaved gallery order/removals. Those remain visible in the page save bar and use the page's Save draft/Publish changes controls. The client retains the last successfully loaded/saved collection in `state.versions.gallery.saved`, clones that base, replaces the selected unique image record (or appends a newly uploaded unique image), and submits through the existing authenticated `/api/dash-save` contract with both expected SHAs. All unknown record/top-level fields survive. The schema has no stable per-photo IDs; if the same image path appears more than once, the card Save refuses an ambiguous match and directs staff to the whole-gallery Save draft button. Never silently choose one duplicate by array index.

After a photo save, update the saved base and shared draft SHA while leaving the complete working collection intact. Cache all remaining edits against that new revision for recovery; edits typed while the request runs remain unsaved. A failed or conflicting save keeps text and shows an error in the card and page feedback. Never show success for a failed write. Global Save draft and Publish keep their existing whole-gallery semantics. An open in-card editor counts as an active editor for source-sync protection, just as the old dialog did.

Reordering or moving a photo to another collection deliberately changes the gallery; reopen the same photo by session identity. Closing a form keeps unsaved work; it does not save or publish. Removing a photo reference is not an asset delete. Per-photo draft visibility remains separate from shared draft save and section publication.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

`tests/gallery-panel.cjs` checks every card rectangle before/after open, internal scroll and close, containment within the chosen card, pinned Save photo, single-photo saves versus unsaved sibling edits, refresh recovery, failed-save retry, edits during a request, revision conflicts, Escape/focus return and phone/tablet/desktop light/dark accessibility. It uses isolated content fixtures. Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
