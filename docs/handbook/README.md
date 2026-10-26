# Sane Living — agent and team handbook

This is the entry point for maintaining the real Sane Living website and staff dashboard. It documents the current implementation, not a replacement architecture. Read [STACK.md](STACK.md), [CONTENT_AND_OPERATIONS.md](CONTENT_AND_OPERATIONS.md) and the appropriate page rulebook before changing code or data.

## Dashboard rulebooks

| Page | Guide | Primary ownership |
|---|---|---|
| Home | [HOME.md](dashboard/HOME.md) | Operational overview, planner shortcuts and published settings snapshot |
| Events | [EVENTS.md](dashboard/EVENTS.md) | Airtable calendar plus the shared event-story library |
| Photo Gallery | [GALLERY.md](dashboard/GALLERY.md) | Gallery JSON, collections, captions, ordering and per-photo visibility |
| Weddings | [WEDDINGS.md](dashboard/WEDDINGS.md) | Venue information, main photo, policies; separate individual wedding stories |
| Pricing | [PRICING.md](dashboard/PRICING.md) | Rate-session strings and booking copy |
| Partners | [PARTNERS.md](dashboard/PARTNERS.md) | Introduction and partner records |
| Settings | [SETTINGS.md](dashboard/SETTINGS.md) | Stable site-wide settings schema and frontend hooks |
| Page Editor / About | [EDITOR.md](dashboard/EDITOR.md) | Structured layouts, source captures, private previews and reviewed publication |
| Login / appearance | [LOGIN_AND_APPEARANCE.md](dashboard/LOGIN_AND_APPEARANCE.md) | Staff session and browser-only Light/Dark/Auto preference |

[Public page index](public-pages/INDEX.md) links one source-based guide per website route. These identify source HTML, route aliases, IDs, scripts, hooks and relevant ownership. Consult the actual source as well: another teammate can change main while you work.

## Read order for common tasks

- Upload a photo: CONTENT_AND_OPERATIONS → GALLERY or WEDDINGS → existing upload handler. Use a new filename, then explicitly select/save/publish the referencing content. A file upload alone does not publish its placement.
- Add an event before Airtable setup: EVENTS → shared planning draft. Add its title, date/time, host, media and story. Save draft; it is not on the live calendar.
- Connect/publish an event: EVENTS → AIRTABLE_SETUP. Create or edit the actual Airtable record, deliberately enable calendar visibility, then publish approved story details. Do not create duplicate records to fix a stale view.
- Change website design: relevant public-page guide → DESIGN.md → editor source-capture/active-layout contracts. Dashboard-only requests must leave this design intact.
- Resume another agent's editor work: EDITOR → docs/editor/START_HERE.md → IMPLEMENTATION_STATUS.md → relevant numbered contract, then inspect current main and source SHA. Do not replace the editor runtime or tuned controls casually.
- Release: RELEASE_AND_TESTING.md → complete one reviewed batch → expected-head update → verified Vercel deployment and live asset checks.

The event archive inventory is [EVENT_ARCHIVE_SOURCES.md](EVENT_ARCHIVE_SOURCES.md). Original flyers and recordings are preserved. Unknown dates/hosts remain blank for verification, rather than being guessed from filenames.
