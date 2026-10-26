# Home overview and planner

## Entry and ownership

Dashboard route: `/dash/#home`. Implementation: public/dash/app.js: renderHome, calGridHtml, calDayListHtml, bindHome.

Data: Derived published settings, live Airtable records and dated working event stories. No independent calendar database.

## Working rules

Monthly day selection, Previous/Next/Today, selected-day Add event and edit shortcuts. Without Airtable, Save planning draft uses the versioned shared event-story draft. Planning entries are labeled and are not live bookings. Natural left/right card stacks keep fixed gaps without row-height holes. Never hide the calendar or replace published contact details with a local settings draft.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
