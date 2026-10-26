# Staff login, logo and appearance

## Entry and ownership

Dashboard route: `/dash/` sign-in and the persistent dashboard shell. Implementation: api/_dashlib.js, api/dash-login.js; public/dash/appearance.js/.css; index.html shell.

Data: Signed sl_dash staff session; server-only CMS credentials; browser appearance preference sane-dashboard-appearance.

## Working rules

Light/Dark/Auto is local UI preference, never website content. Apply before paint and preserve forms/unsaved work when switching. Cross-tab/system changes update CSS only. Safe fallback when storage is blocked. The logo links to dashboard Home through existing SPA navigation, retaining active work; image sizing is responsive and contained. Keep clear logo backing in dark theme. The Page Editor retains its independent theme/canvas.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
