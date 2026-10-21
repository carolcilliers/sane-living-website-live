# Website Studio: implemented profile

October 21, 2026. This is the current implementation contract. The earlier numbered planning documents describe the larger target architecture; their proposed database, individual roles, deployment worker and restore service are not installed. This profile extends the source/renderer proof with browser-private authoring and an authenticated atomic publisher. It does not claim those future gates are complete.

## Team workflow

Open **Page Editor** in the dashboard. About is included in its Pages panel; Settings remains the last dashboard section. Existing `#about` links select About in the editor. The compact toolbar, left Pages/Insert/Layers panels and right inspector are inspired by Framely's workspace layout. No Framely application source is incorporated.

All 25 registered public pages load their current trusted HTML, scripts, navigation, typography and footer. Select an original section to change its exposed text, links and images, reorder it or hide it. Original sections cannot be deleted or duplicated: their IDs and script dependencies must survive. The inspector routes canonical Settings, Gallery, Events, Weddings, Pricing and Partners data back to their existing dashboard owners. Existing navigation order/visibility remains owned by Settings. Page-list ordering organizes the editor; it does not silently rewrite that navigation.

Insert supports Heading, Text, Image, Split, Button, Spacer, Divider, Callout, Gallery, Events, Pricing, Partners, Booking and Newsletter. These are approved structured blocks, not arbitrary HTML or user JavaScript. New blocks support reorder, duplicate, hide and remove. Create a page with a unique slug; its optional menu link is added to existing navigation. New routes have explicit rewrite ownership under `public/site-pages/`.

About uses the existing Markdown adapter and renderer, including founder attachment, unknown metadata and suffix preservation. Its rich field inspector replaces the former raw dashboard form. Older About drafts can be imported explicitly; they are never silently published or deleted.

**Save draft** and automatic recovery write only to IndexedDB in this browser and origin. The status explicitly states this limit. Nothing is sent to GitHub on Save. Download/import moves a draft between browsers manually. A browser quota/security failure preserves the in-memory work and offers Download. Revision checks stop two tabs from overwriting or clearing each other's newer recovery. Clearing browser data removes local drafts. Logout clears this browser's editor store and invalidates open editor/preview views.

**Preview** opens a new tab containing an immutable private snapshot, all pages and staged images. Later typing cannot change that snapshot. It is not published, publicly shareable or available in another browser. The preview freezes its layout and canonical JSON resources; approved Events blocks still read the published event feed. Existing trusted site code still runs, while form submissions, external navigation and embedded forms are disabled. The canvas is an authoring surface, not a production transaction test.

**Publish** presents a scope review. The accepted snapshot becomes one commit directly on `main`, using the dashboard's existing server-side GitHub credential and staff session. The UI distinguishes accepted commit from verified live page. It polls for the release marker on the selected public route for a bounded period. A timeout reports unverified deployment; it does not claim the commit failed or publish again automatically. The last accepted release can be recovered after refresh from its descriptor. Individual staff identities and a durable deployment job service remain future work.

Gallery in the dashboard now groups each existing section into one labeled card containing its images. Data formats, upload actions and public gallery ownership remain unchanged.

## Source and build contract

| Owner | Files and behavior |
| --- | --- |
| Registered source snapshots | `content/page-templates.json`: exact trusted HTML for 25 pages, content digest and Git blob digest |
| Shared page model | `content-core/site.cjs`: validation, source-preserving original sections, approved block renderer |
| Published layouts | `content/site-layouts.json`, created only by Publish; inactive pages retain developer-owned bodies |
| About content | `public/content/about.md`, written only if About actually changed |
| Other canonical resources | Existing `public/content/` JSON and dashboard publishers; Studio reads their pinned versions |
| New staged images | IndexedDB until Publish; referenced validated files become `/images/studio-UUID.ext` |
| Atomic publication | `api/studio.js`, `api/_studio/service.js`: authentication, source checks, validation, Git tree/commit/ref |
| Generated output | `scripts/build-pages.cjs`, then existing `scripts/build-content.cjs`; one registered output per route |
| Release identity | `content/releases/UUID.json`, layout release ID and generated `sane-release` meta |
| Trusted behavior | `public/studio-runtime.js`, shared CSS; canonical event reads and approved integration URLs |

The code launch includes no layout document, release descriptor or edited public page. Until the first explicit Publish, the layout build step is a no-op. Existing source pages are preserved. Active pages thereafter render from their registered snapshot; original DOM fragments retain event IDs/scripts, and edits apply through source offsets with escaping. Hiding keeps DOM present. Existing canonical adapters can still change their owned fields. The final existing build pass retains metadata and managed About ownership.

New pages use `public/site-pages/<slug>.html` with `/slug` and `/slug/` rewrites committed alongside the layout. Reserved routes and collisions are rejected. No duplicate `public/<route>/index.html` routes are introduced. Deleted page support and arbitrary nesting/free positioning are not implemented.

### Future frontend redesigns

Keep semantic content and integration sources stable. For an **inactive** registered page, change its public source and run `node scripts/capture-page-template.cjs <page-id>`, then review source, template and any published layout changes together. This refreshes the digests and inactive block references. The helper refuses active pages: migrating an active layout requires an explicit developer mapping/review; do not overwrite it with a recapture. Commit template changes with their source changes. Private drafts from an older template revision cannot publish blindly; download/reconcile them first.

Authenticated bootstrap compares its bundled registry to `main` and verifies inactive source blob hashes. A changed frontend source without a matching capture, an old deployed editor or a stale layout blocks publication rather than writing an old design over a redesign. This is a compatibility guard, not an automatic migration engine.

## Publication protocol and failures

1. Bootstrap reads one immutable `main` SHA, the registry, layout and six canonical sources. Missing or invalid required content is an error, never an empty editable replacement.
2. A reviewed request carries version 2, expected head, stable release UUID, layout, canonical About text and staged assets. The server validates exact fields, IDs, routes, props, safe URLs and source ownership. Limits: 50 pages, 100 blocks per page, 700 KB layout, 3.5 MB request, 12 images, 1 MB each and 2 MB combined. Raster magic bytes are checked; SVG uploads are not accepted.
3. Only referenced staged assets are promoted. Identical existing Git blobs may be reused; a conflicting path is rejected. Unknown components, arbitrary markup, stale heads, changed canonical sources and conflicting rewrites fail before the ref advances.
4. The server renders a preflight, preserves unrelated Vercel config and creates one tree containing the layout, changed About only, referenced images, new route rewrites if needed and release descriptor.
5. A commit with the expected parent is advanced using a non-force `main` update. Concurrent updates reject safely. The same release UUID and request hash resolves retries to the accepted commit. Lost ref responses are reconciled against Git ancestry. A reused UUID with a different payload is rejected.
6. The UI acknowledges the reviewed version only. New typing during the request stays in the workspace. A failed post-commit refresh says the commit was accepted and requires refresh; it does not label it an unsaved failed publish.

The original shared-team cookie authorization remains in force. This does not add per-user attribution or page-specific roles. POST has an origin check and all responses are private/no-store. Runtime credentials remain server-side; this chat's GitHub grant is unrelated to the deployed `CMS_GITHUB_TOKEN`.

## Verification and rollout

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. Browser tests require Playwright Chromium or `CHROMIUM_EXECUTABLE_PATH`. `npm run dev:editor` uses an isolated fixture server; never run fixture tests against production data.

The suite exercises real API handlers with isolated Git fixtures: authentication, all 25 page sources, invalid schema, atomic commit, lost response, idempotent retry, concurrent head conflict, route creation, repeated build stability, About preservation and legacy dashboard/settings regression flows. Browser checks cover edit/save/reload, immutable new-tab previews, actual page canvas/chrome, original field editing, staged images, keyboard sorting, About integration, custom page publication and grouped gallery at responsive widths. Storage tests also force quota failure and verify downloadable recovery, saved-version restoration and save/clear conflicts across tabs. These checks do not prove production credentials, real Airtable transactions or a successful Vercel deployment.

Before production acceptance: deploy the commit, verify the new lazy-loaded editor assets, authenticate as staff, test a harmless private save/preview, then review a deliberate publish and observe its release marker. Verify real canonical integrations independently. The previously observed Vercel scope denial for `carol-cilliers` prevents deployment management through the current connection; do not equate a Git commit with a successful deployment.

Rollback code through a normal revert commit. If layouts have already been published, preserve the content and staged-image history; review the release's parent and relevant content diffs before restoring. There is no one-click release restore service. Hiding the Page Editor disables its UI, but do not remove its renderer while a published layout depends on it. Keep Settings, event feeds, original redirect rules and legacy content APIs available.

## Remaining larger-plan work

Shared private draft/media storage; cross-device previews; individual identity/roles; durable deployment verification and rollback jobs; active-template migration tools; richer typography/layout controls; additional approved integrations; publish-time integration health checks. Keep these as explicit future work, not implied behavior of the current buttons.
