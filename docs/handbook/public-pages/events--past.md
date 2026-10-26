# Past Events route and legacy source

`/events/past/` and `/events/past` currently redirect to `/events/#recent` by vercel.json. The active archive is the recent-event wall in public/events.html. public/events/past.html remains a legacy authored source containing the original poster collection and video link; it is not a second canonical calendar database. Do not remove its assets merely because the route redirects.

Use dashboard Events → Past events for Airtable history and imported archive stories. The new event-story source inventory preserves fifty original poster references and the dedicated intensive's four recordings. Unknown dates/hosts remain unverified. Changes to approved stories fill existing components after explicit publication. Keep originals intact until a reviewed content change is published; shared planning drafts do not become public calendar events.

Follow the active [Events guide](events.md), [event authoring rulebook](../dashboard/EVENTS.md), [source inventory](../EVENT_ARCHIVE_SOURCES.md) and [backend contract](../CONTENT_AND_OPERATIONS.md). Any future route consolidation or public-page redesign requires explicit scope and source-template review. Test the redirect destination and actual API feeds after deployment, not just the legacy filename.
