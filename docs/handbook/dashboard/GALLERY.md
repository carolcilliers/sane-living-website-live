# Photo collections and focused editing

## Entry and ownership

Dashboard route: `/dash/#gallery`. Implementation: public/dash/app.js: renderGallery, bindGallery, groupsHtml, photoCard.

Data: public/content/gallery.json; shared gallery draft; photos array with image/caption/alt/section/group/draft.

## Working rules

Venue, Weddings and Outdoor collections retain their keys. Search/status filters and 12-photo pages preserve original global indices. Reorder within a collection, and disable ambiguous filtered ordering. Open one photo editor at a time. The selected editor spans its own row; closed cards keep their natural height. Removing a photo reference is not an asset delete. Per-photo draft visibility remains separate from shared draft save and section publication.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
