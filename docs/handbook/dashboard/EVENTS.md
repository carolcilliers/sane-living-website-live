# Calendar and rich event library

## Entry and ownership

Dashboard route: `/dash/#events`. Implementation: public/dash/app.js and public/dash/event-workspace.js.

Data: Airtable owns calendar visibility. public/content/event-stories.json and dashboard-drafts/eventStories.json own rich stories.

## Working rules

Search and filter all/upcoming/past/drafts and event/workshop/wedding categories. Twelve cards per page bound the DOM. Each story disclosure has schedule, introduction/body, host, poster, gallery, recordings and publication controls. Original archive posters keep their source URL/image. Dates and hosts not verified in the source stay blank. Raw calendar controls create/edit/publish/unpublish/delete through dash-events. New story drafts do not silently create Airtable records. Shared stories have stable IDs and optional Airtable IDs. Approved-only publication preserves remaining plans in the shared draft; see AIRTABLE_SETUP and CONTENT_AND_OPERATIONS.

## Backend and recovery

Read ../CONTENT_AND_OPERATIONS.md for auth, exact content payloads, unique uploads, published/shared SHA checks, recovery and publication. Changes in a browser are not team-saved until Save draft succeeds. Publishing is deliberate and deployment/CDN can follow later. Keep failed edits and visible errors; do not replace failed loads with empty content or bypass conflicts.

## Verification and handoff

Exercise the actual page controls, complete read → edit → save → reload → publish checks in isolated fixtures, verify unchanged authored values outside the intended edit, and inspect both themes at phone/tablet/desktop sizes. Existing tests/dashboard-* and tests/studio-* plus the event planner tests cover these boundaries; consult ../RELEASE_AND_TESTING.md. Update this guide when ownership or user workflow changes.
