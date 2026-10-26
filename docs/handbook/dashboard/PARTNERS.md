# Local partner directory

## Entry and ownership

Dashboard route: `/dash/#partners`. Implementation: public/dash/app.js: renderPartners, bindPartners.

Data: public/content/partners.json; intro plus partners array.

## Working rules

Keep name, category, description (legacy blurb fallback), website and image. Add focuses the new Business Name field; name/photo edits update their previews without replacing the form. Remove only after confirmation. Shared draft/recovery/publish preserve the full object and unknown keys. Preserve authored mutual-referral/no-fee rules and permission to list a business.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
