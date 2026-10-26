# Wedding venue settings and individual stories

## Entry and ownership

Dashboard route: `/dash/#weddings`. Implementation: public/dash/app.js: renderWeddings, bindWeddings; event-workspace wedding bridge.

Data: public/content/weddings.json owns venue information. Individual wedding stories are separate eventStories records.

## Working rules

Preserve all four existing venue sections and every original field: heading, heroImage, intro, highlights, pricingText, includesText, cateringPolicy, alcoholPolicy, parkingNote, phoneDisplay, availabilityNote. Main photo supports upload, gallery choice, URL and restoring the published photo. Add Wedding opens a separate story; it must not replace venue pricing/policies. Past/future wedding stories support media and permission flags. A wedding story is not automatically a public calendar entry. Do not infer client names, dates or consent.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
