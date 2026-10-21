# Current system and integration map

Baseline: `3e020ae628ae609345d3906a5d8180d293fd05ff`. Source observations in this document refer to that commit. See [source register](12_REUSE_AND_SOURCE_REGISTER.md) and [page inventory](inventories/PAGES.md).

## Runtime and build

The public site is independent static HTML files with shared browser scripts, not a React application. `public/dash/index.html` loads a vanilla JavaScript dashboard from `public/dash/app.js`; `studio.css` provides the newer studio styles. Root `api/` contains Vercel serverless handlers. `npm run build` executes `scripts/build-content.cjs`; `vercel.json` serves `public` and defines current rewrites and redirects.

The repository's `npm run dev` serves the repository root. It does not faithfully reproduce the configured production output/API environment. The proof must use a dedicated local harness that serves the built public root and explicit fake APIs; do not use a root-file server as evidence of production route correctness.

## Authoritative resources

| Resource | Source | Writers | Consumers / preservation rule |
| --- | --- | --- | --- |
| Settings | `public/content/settings.json` | Dashboard Settings; manual Git edits | `site-config.js`, `site-content.js`, build metadata; stable keys preserved |
| About | `public/content/about.md` | Dashboard About; manual Git edits | `content-model.js` and build; preserve frontmatter, hidden sections and Markdown suffix |
| Gallery | `public/content/gallery.json` | Gallery dashboard; manual Git edits | Gallery page/shared modal; keep photo draft flags |
| Weddings | `public/content/weddings.json` | Weddings dashboard; manual Git edits | Weddings HTML script; layout must bind the same data |
| Pricing | `public/content/pricing.json` | Pricing dashboard; manual Git edits | Pricing HTML script; cleared values/list handling preserved |
| Partners | `public/content/partners.json` | Partners dashboard; manual Git edits | Partners page script; no duplicate listing store |
| Events | Airtable records | `api/dash-events.js`; external Airtable users | Public calendar endpoints and pages; no Git copy as source of truth |
| Legacy `events.json` | `public/content/events.json` | Historical content | Present in repository, not authority for current Airtable feeds |
| SEO baselines | `public/content/page-defaults.json` | Developer/build contract | Used when page overrides are cleared |
| About philosophy | `templates/about-philosophy.html` | Developer | Preserved by build; must be included in migration/restore coverage |
| Images/video | `public/images/`, existing public video files | Upload endpoint / developer | Current uploads immediately exist publicly, though references may remain drafts |
| Shared layout | `public/script.js` plus `site-content.js` | Developer + settings adapter | Nav/footer, mobile interactions, animations and gallery behavior |

The current remote tree contains **25 marketing HTML destinations**; the dashboard and legacy admin entry are separate. Canonical routes come from `vercel.json`, not filename-to-slug guesses. Nested paths such as `/lifestyle/ai-algo/` do not follow a naive conversion of every hyphen into a slash.

## Current API surface

| Endpoint | Current behavior | Implication |
| --- | --- | --- |
| `/api/dash-login` | Shared staff sign-in/session/logout | Preserve existing login while proving editor; roles need a later identity migration |
| `/api/dash-content?section=...` | Authenticated published content/SHA and shared draft/SHA | Private/no-store; failure cannot become empty content |
| `/api/dash-save` | Draft, publish, discard and image upload against fixed paths | Requires expected content/draft SHAs; multi-file atomic release is new work |
| `/api/dash-events` | Authenticated Airtable CRUD; read-only public-feed fallback if unconfigured | Existing record IDs, timezone and public field behavior must survive |
| `/api/calendar-events` | Public upcoming feed, Publish filter, maximum 100 records | Event component uses endpoint, not copied data |
| `/api/calendar-events-past` | Public past feed, Publish filter, maximum 200 records | Preserve behavior; pagination expansion is separate scope |
| `/api/auth` | Legacy Decap login explanation; no token handoff | Source explicitly retires the old editor; do not reintroduce browser token exposure |
| `/api/callback` | Old OAuth explanatory page | Text points at legacy admin; classify as documentation/navigation debt |

`_dashlib.js` signs a seven-day HttpOnly/Secure/SameSite=Lax cookie. It establishes shared-team access, not an individual actor ID. Its signing secret is derived from existing server environment values. Rotating those values invalidates sessions; any identity migration must account for reauthentication.

`_contentlib.js` fixes the target repository and defaults `DASH_BRANCH` to main. Current draft envelopes live under `dashboard-drafts/`. Saves check the published file SHA and draft file SHA. Those checks protect current file operations but do not provide one transaction across dependencies. The future gateway must serialize/check shared-resource writes from every interface.

## Functional adapters to preserve

- Home and Events load `/api/calendar-events`; past Events loads `/api/calendar-events-past`.
- Contact embeds an Airtable inquiry form and Google Maps.
- Rent embeds a rental inquiry form; Pricing and Weddings embed Airtable availability and use booking destinations.
- Events has a Mailchimp subscribe action. Settings also control shared newsletter output; do not duplicate the two into accidental double forms.
- Sculpture and the intensive event page embed Vimeo; Inspiration embeds YouTube.
- Home and Farm use local hero videos. Preserve posters, autoplay/mute/reduced-motion behavior and mobile fallbacks during conversion.
- The shared script injects navigation/footer and installs gallery/mobile behavior. Editor preview cannot export a mutated live DOM as canonical source.

Full per-page scripts, embeds, form hosts, source dependencies and classifications are in the generated inventory. Inventory classification is an engineering recommendation, not evidence that every interaction was tested.

## Important repository discrepancies

`CLAUDE.md` is useful but contains stale statements. Do not rewrite it as part of this planning task; put corrections into the implementation backlog:

| Existing note | Current source evidence |
| --- | --- |
| API directory described as two functions | There are multiple staff/auth/content handlers in addition to the feeds |
| Decap described as an active writer/path problem | `api/auth.js` explicitly retires its token handoff; `admin/config.yml` now points About at the public content path |
| Airtable variables described as Production only | `.env.example` suggests Preview + Production; actual environment configuration is inaccessible in this session |
| Events empty because Publish is unticked | Current live feed returns configuration-missing HTTP 500; do not assume a data-only problem |
| Generic `/api/contact` handling | Shared script contains a handler, but no such API exists in the current tree; Contact uses the inquiry iframe |

Both public feed handlers allow a debug parameter that skips the Publish filter, and another exposes raw fields. This is **source-observed behavior**, not a live-data exposure test. Add a pre-release ticket to authenticate/remove those modes and test with isolated fixtures; preserve the ordinary published-event contract. Do not query production unpublished data to prove the issue.

## Routing invariant

One route has one physical output and one rendering owner. Keep existing `public/<name>.html` destinations and rewrite pairs. Never create twins such as `public/about/index.html`, `public/events/index.html` or directory variants for the lifestyle pages. Static filesystem precedence can shadow configured rewrites. New pages initially use developer-registered routes; generalized page creation comes after route-manifest tests.

## Current verification limits

The isolated content API suite passed during this preparation. Public root, dashboard shell and settings returned HTTP 200; unauthenticated content read returned 401. Both public calendar feeds returned HTTP 500 configuration missing. The Vercel project lookup returned a team-scope 403. No authenticated production save, event mutation, form submission, new browser editor test or new deployment was performed. See [readiness](11_READINESS_AND_OPEN_DECISIONS.md).

