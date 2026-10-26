# Rental session cards

## Entry and ownership

Dashboard route: `/dash/#pricing`. Implementation: public/dash/app.js: renderPricing, bindPricing.

Data: public/content/pricing.json and shared pricing draft.

## Working rules

Each original row retains label, sublabel, monThu, friday, saturday and sunday strings. Do not normalize currency, coerce numbers, invent discounts, add rates or change authored prices during styling. Preserve noteDate/noteText/hoursHeader, weddingsNote/availabilityNote and CTA fields. Session headings update in place; save/publish still serializes the complete object.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
