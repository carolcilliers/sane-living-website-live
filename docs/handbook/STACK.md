# Stack, business and ownership

## Business context

Sane Living Center is a venue at 316 E. Matilija St, Ojai, CA 93023. The website's published settings are the authoritative business/contact values; do not duplicate phone/address/hours into a new config. It hosts gatherings, workshops, screenings, community events and weddings. Staff have mixed technical experience. Use clear labels, readable fields, consistent buttons, local recovery and explicit save/publication states. Event/wedding facts, capacities, pricing and permission must come from authored source, not inference. Partner referral rules and existing wedding policies are authored business information to preserve.

## Runtime map

- Public marketing site: static `public/<route>.html`, shared `public/style.css`, subpage styles, `script.js`, `site-config.js` and `site-content.js`. Vercel rewrites map routes to HTML. Static files take precedence: never add an index.html twin for an existing HTML route.
- Native dashboard `/dash/#<page>`: index.html contains shell/base styles; app.js owns native state, navigation, content loading and shared save bars. event-workspace.js adds the event-story authoring UI. workspace.css owns established layouts; appearance.css owns coordinated theme/material refinements. appearance.js sets browser Light/Dark/Auto before paint.
- Page Editor: React 19 + TypeScript + Vite under editor/src. Uses dnd-kit and Moveable. Generated output under public/dash/editor is ignored. It is embedded in the dashboard; its website canvas must match the source website, independent of dashboard CSS.
- Shared content/layout logic: content-core/site.cjs, renderer modules and content/page-templates.json. Build order is editor → explicitly active layouts → canonical content/SEO/About build. `npm run build` is required.
- Backend: Vercel Node serverless functions under api. Staff authentication uses the signed sl_dash cookie and _dashlib. CMS GitHub credential stays server-side. Native content reads/writes use _contentlib and the allowlist in FILES. No Supabase/shared private database is installed.
- Calendar: dash-events reads all Airtable pages, including unpublished/past entries. Public upcoming/past feeds use the same table, its Publish flag and Los Angeles dates. Event-story metadata is supplemental; it does not fabricate Airtable bookings.

## Stable data boundaries

| Data | Source | Save / publish |
|---|---|---|
| Venue photos | public/content/gallery.json | Shared native draft; per-photo draft flag and explicit publication |
| Wedding venue settings | public/content/weddings.json | Shared native draft and explicit publication |
| Rates | public/content/pricing.json | Same; preserve string values exactly |
| Partners | public/content/partners.json | Same; retain unknown/legacy fields |
| Site settings | public/content/settings.json | Schema and defaults in public/site-config.js |
| About | public/content/about.md | Structured frontmatter; retain unknown metadata and trailing text |
| Event stories | public/content/event-stories.json | Approved public stories; complete working collection retained in dashboard-drafts/eventStories.json |
| Calendar entries | Airtable table | Staff API writes; Publish controls public calendar visibility |
| Layouts | content/site-layouts.json and template registry | Editor's reviewed publication protocol |
| Device recovery | localStorage / editor IndexedDB | Recovery is not a team save or website publication |

See CONTENT_AND_OPERATIONS for exact API payloads and AIRTABLE_SETUP for calendar prerequisites. Project IDs, repository/ref guards and route paths must be inspected, not guessed from filenames. Future agents should discover actual tools and connection permissions; connector access is separate from production server credentials.
