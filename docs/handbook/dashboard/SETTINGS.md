# Site-wide settings

## Entry and ownership

Dashboard route: `/dash/#settings`. Implementation: public/dash/app.js plus public/site-config.js and public/site-content.js.

Data: public/content/settings.json; defaults, validation, category definitions and frontend hooks in site-config.js.

## Working rules

Brand, Contact, Homepage, Booking, Newsletter, Announcement, Sharing and Navigation keep stable schema keys. Categories are keyboard tabs; described field groups have disclosures and Show/Collapse All. Upload stages assets; Save and Publish remain explicit. Logo/favicon/hero/contact/SEO/embed settings must survive frontend redesign through the same hooks. Raw scripts, credentials and arbitrary iframe snippets are not settings. Navigation renames/reorders/hides existing routes; it does not create/remove pages. Airtable embeds do not change API credentials or the table.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
