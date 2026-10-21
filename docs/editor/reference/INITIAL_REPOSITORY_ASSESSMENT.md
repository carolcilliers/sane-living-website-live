# Sane Living visual editor — repository assessment and architecture plan

Prepared October 20, 2026 • Planning only • No website implementation or publication

## 1. Recommendation

Build one Sane Living page editor around a versioned, structured page model. Of the five repositories, **OpenPage is the best candidate for an editor foundation**, subject to a short technical proof before committing to a fork. Reuse selected editor components and interaction patterns, then connect them to Sane Living’s own content, authentication, assets, GitHub publishing and Vercel deployment flow.

Use Framely as a reference for element selection, property panels and nested layouts. Use the supplied VvvebJs-based website-editor as a reference for visual selection and, potentially, a separate migration experiment. Visual Composer and Piper should inform product design rather than become dependencies.

Combining the five applications literally would introduce multiple renderers, histories, storage systems, authentication systems and competing definitions of a page. The useful unification is their capabilities: a good canvas, reusable sections, readable controls, responsive editing, safe saving and dependable publication.

This is a conditional architecture recommendation, not a claim that OpenPage is production-ready. Source inspection found important gaps in its storage, export, functional components and publishing behavior. Those gaps are central to the plan below.

### Working assumptions

- Team members edit pages of the shared Sane Living website. Separate personal websites, domains or tenant accounts are outside the initial scope. If “their own web page” means individually owned microsites, ownership, routing and access requirements must be expanded first.
- The forthcoming frontend redesign should change templates and styling without forcing a replacement of settings, page content or publishing infrastructure.
- Existing event data stays in Airtable. Existing gallery, pricing, partners and booking/form integrations keep their authoritative sources.
- The initial publishing workflow can continue writing directly to `main`, without requiring branches or pull requests. This document does not create either.
- Normal team editing needs no AI service. Any future AI feature must submit the same validated page changes that manual editing uses.

## 2. What was inspected and what remains unverified

I inspected current default-branch repository metadata and file trees, READMEs, available license files, package manifests, representative editor state and rendering code, and persistence/publishing paths. For Sane Living, I inspected the content-studio contract, content API, save handler, build script and Vercel configuration.

This was a source-based architecture review. I did **not** install or run all five editors, benchmark their canvases, perform a dependency vulnerability audit, or complete a browser usability/accessibility audit. README feature and performance claims are not treated as verified results. The first development phase below explicitly tests the unresolved behavior.

| Repository | Default branch | Reviewed head | Head commit date, UTC | License evidence |
| --- | --- | --- | --- | --- |
| belastrittmatter/Framely | main | `943d254020710560da36e9afc328c49269c00f6c` | 2026-01-02 | Root MIT license |
| VisualComposer/builder | master | `29374072a05b47f86090dac29825af9665b01048` | 2026-10-06 | Root GPL v3 text; package manifest says GPL-2.0+ |
| fireyy/piper | dev | `55f254709184991d26d37327e6408a9cedfc7654` | 2018-03-08 | No license identified in root tree or package manifest |
| buildingopen/openpage | master | `9818eb43a88e01b23cb55752e19902d8285a853b` | 2026-03-07 | Root MIT license |
| mars9541/website-editor | master | `356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6` | 2023-06-18 | Root Apache 2.0; bundled assets have additional notices |
| carolcilliers/sane-living-website-live | main | `3e020ae628ae609345d3906a5d8180d293fd05ff` | 2026-10-21 | Existing project; inspected as integration target |

Dates refer to default-branch head commits, not repository stars, recent metadata updates or a promise of maintenance. None of the five candidates was marked archived in the retrieved metadata. Source links in section 15 pin this assessment to the inspected versions.

## 3. Repository-by-repository assessment

### OpenPage: strongest foundation, substantial integration required

**Observed architecture:** React 19, TypeScript, Vite, Zustand and Immer, with dnd-kit for layer reordering. The block registry contains 19 block types. Pages contain ordered blocks; each block has an ID, type, variant and properties. The canvas renders registered React components, and a property panel edits configuration. A bounded undo stack stores snapshots; local persistence uses Zustand’s browser storage middleware. [O1–O4]

**Useful parts:** block registration, page/layer navigation, section variants, property controls, theme tokens, viewport controls, keyboard-assisted layer reordering, duplicate/remove actions and a structured configuration model. These are close to the team’s actual needs: move sections, change text/images and choose approved layouts.

**Important source findings:**

1. Project/config persistence is browser-local. The autosave path updates a local project store; it is not a shared team draft service.
2. “Version History” is a view of the in-memory undo stack, capped at 50 entries. It is not a durable record of releases or edits by teammates.
3. The model supports `pages[]`, but the inspected HTML exporter renders `config.blocks`. Its deployment handler sends one `index.html` file. This is not a complete multipage publishing pipeline.
4. Publishing creates a standalone production deployment named from an OpenPage slug. It does not commit changes to Sane Living’s repository or preserve its API routes, rewrites and complete asset bundle.
5. Contact and newsletter canvas components display success toasts without sending data. Their exported forms disable submission. These cannot replace Sane Living’s functioning service integrations.
6. Preview rendering and HTML export are separate implementations. The hero component and exporter illustrate different rendering paths; parity must be proven, not assumed.
7. The exporter includes the Tailwind Play CDN despite the README describing self-contained output with zero runtime dependencies. Production output needs locally compiled styling.
8. Block properties are a generic record at the shared type boundary. TypeScript assertions in components do not provide server-side runtime validation. Escaping an HTML attribute also does not establish that a URL scheme is safe.

**Decision:** adapt a deliberately small subset. Replace persistence and publication; introduce real block schemas; produce preview and published output from the same component definitions; build Sane Living blocks. Do not copy its standalone deployment endpoint into this dashboard. [O3–O8]

**Limits:** the observed drag-and-drop implementation primarily reorders top-level blocks in the layers panel. The canvas offers section selection and move controls. Arbitrary nested dragging, pixel positioning and direct inline rich-text editing are not established by this review. Those should be specified as additional work.

### Framely: useful editor reference, excessive platform scope for this site

**Observed architecture:** Next.js 15 / React 19, Tailwind and shadcn-style controls, Clerk authentication, Prisma and MySQL. The page model stores an owner ID, subdomain, visibility flag and serialized element content. Editor elements support recursive containers, text and images, with styles and selection state. [F1–F4]

**Useful parts:** a clear distinction between selected elements and rendered content, inspector categories, recursive element rendering and separate editor/live modes. Its owner-scoped update query is also a useful example when defining future page permissions.

**Integration cost:** adopting the application wholesale would add a second login system, database, server-rendering stack and subdomain model to a static website/dashboard that does not currently need a multitenant website SaaS.

**Source caveats:** the README says the author is no longer actively building features. Saving content updates the database record used by the live renderer; the Draft/Public switch controls visibility. This differs from a private working draft plus a separately published revision. The editor explicitly blocks editing on mobile-sized devices. `getSiteDetails(siteId)` has no ownership check inside that action, so any reuse would require a wider authorization review rather than assuming every action is secured identically. [F1, F3, F4]

**Decision:** reference selected UI/layout patterns. Do not introduce Clerk, Prisma, MySQL or subdomain routing just to embed an editor. If reusable code is copied, preserve MIT notices and review its full dependency path.

### Visual Composer: mature product reference, wrong hosting architecture

**Observed architecture:** a WordPress page-builder plugin with PHP bootstrap/modules, a JavaScript editor, WordPress post data and save hooks. The save code and backend controller depend on WordPress services such as post metadata and `save_post`. [V1–V3]

**Useful parts:** product organization around reusable elements, section settings, templates and a separation between content controls and design controls.

**Integration cost:** adopting it as the editor engine would mean hosting WordPress/PHP and bridging its content model into the current website—or migrating the site onto WordPress. That is a different project and works against the current architecture.

**License caveat:** the root license/README indicate GPL v3 while `package.json` declares GPL-2.0+. Resolve the applicable notices for any particular copied component before reuse. This plan avoids importing its code; it does not assume premium templates, cloud assets or add-ons are included in the public repository’s license. [V1, V4]

**Decision:** use as a UX reference; no WordPress migration and no source-code dependency in the proposed editor.

### Piper: historical reference, unsuitable foundation

**Observed architecture:** Vue 2 / Vuex, Element UI, Koa, Sequelize and SQL storage. Modules contain data, styles and optional children. Its mobile-oriented drag preview uses a 375px width. Publishing writes local files, runs Webpack synchronously and uploads through a Qiniu publishing adapter. [P1–P4]

**Useful parts:** the straightforward module/property concept and mobile-oriented authoring perspective.

**Integration cost:** a separate Vue application, aging build stack, database/server lifecycle and asset-hosting model. GitHub OAuth in this project is login functionality, not evidence of Git-backed website publication.

**Reuse restriction:** no project license was identified in the inspected root tree or package manifest. Public visibility alone does not establish permission to copy its code. Exclude direct reuse unless licensing is clarified. This is a reuse gate, not a legal opinion about every file. Its default-branch head dates to 2018. [P1–P3]

**Decision:** conceptual reference only; do not modernize or integrate it for this project.

### mars9541/website-editor: useful HTML editing reference, risky default source model

**Observed architecture:** the README, package identity, copyright headers and builder globals identify this as VvvebJs-based code, using jQuery and Bootstrap. It loads pages into an iframe, edits the DOM, tracks undo mutations and exports the document’s outer HTML. Its save/upload examples are PHP scripts. [W1–W4]

**Useful parts:** visual element selection, breadcrumbs, property inputs, media controls, iframe preview and the ability to work with existing HTML. It is the closest of these candidates to opening today’s static pages directly.

**Why it is not the default recommendation:** Sane Living’s browser DOM is not identical to its source files. Navigation/footer injection, content adapters, event rendering, galleries and form embeds can modify the page after load. Serializing that DOM could bake in generated content, duplicate shared markup or erase the relationship to the real data source. The build-generated About page could later overwrite edits made directly to its HTML.

**Backend caveats:** `save.php` is an example filesystem writer, not Sane Living’s authenticated Git publisher. No staff-session authorization is present in that file. The example upload handler denies PHP while the stricter extension allowlist is commented out. Neither handler should be deployed as supplied. The package’s test command explicitly reports that no test is specified. [W2–W4]

**Provenance:** before taking any code, identify the appropriate upstream VvvebJs version and compare this supplied repository with it. The source advertises other repository names; I have not established that this copy is the best-maintained upstream. Preserve Apache notices, change notices and applicable third-party asset notices. Optional rich-text plugins and bundled icon/media collections need their own inventory. [W1, W5]

**Decision:** consider only a separate, time-boxed HTML migration proof if preserving arbitrary existing HTML becomes mandatory. Do not run two editing engines against the same canonical page.

## 4. Selection matrix

The ratings below are architectural judgments from the inspected source, not measured performance scores.

| Criterion | OpenPage | Framely | Visual Composer | Piper | website-editor |
| --- | --- | --- | --- | --- | --- |
| Structured page content suitable for redesign | Strong starting point | Element tree; more low-level | WordPress-specific | Legacy module model | Primarily DOM/HTML |
| Fit inside current dashboard | Moderate adaptation | Large platform extraction | Poor | Poor | Moderate UI fit |
| Existing arbitrary HTML editing | Requires migration | Requires migration | WordPress migration | Requires migration | Strongest candidate; round-trip risks |
| Shared team draft backend suitable as supplied | No | DB exists; draft/live redesign needed | Requires WordPress | Separate legacy backend | No suitable Git backend |
| Publishes the complete Sane Living project as supplied | No | No | No | No | No |
| Source reuse position | MIT | MIT | Resolve GPL notices/scope | License unresolved | Apache plus asset/plugin review |
| Recommended role | Conditional core | UI/layout reference | UX reference | Conceptual reference | Migration alternative/reference |

**Decision gate:** if the requirement becomes “open every arbitrary HTML page unchanged and freely edit every DOM element immediately,” reconsider the core choice. That favors an HTML editor, but requires a different migration and preservation strategy. For a site undergoing a major redesign, a structured block editor is the better long-term tradeoff.

## 5. The current Sane Living foundation

The inspected site is a static HTML website with serverless API handlers and a vanilla JavaScript dashboard. It is not currently a React/Next.js application. Vercel runs `npm run build` and serves `public`. The build materializes About content and SEO/favicon settings. [S1–S4]

| Concern | Current authority | Editor integration rule |
| --- | --- | --- |
| Logo, favicon, contact details, booking links, navigation and metadata | `public/content/settings.json`, normalized by `public/site-config.js` | Bind to these fields; do not duplicate a separate editor logo/settings store |
| About sections and content | `public/content/about.md` | Use a content adapter or deliberate migration; never edit only generated `about.html` |
| Gallery, weddings, pricing and partners | Existing JSON content files | Reuse collection adapters and preserve publishing semantics |
| Events | Airtable via existing API handlers | Editor controls presentation; Events dashboard controls records |
| Route rewrites and redirects | `vercel.json` | Treat as application configuration, not arbitrary staff-editable text |
| Shared navigation/footer | Shared scripts plus settings adapter | Render as shared site components; avoid per-page copies |
| Public content writes | Authenticated `dash-save` with file allowlist and revision checks | Extend through typed content operations; do not expose arbitrary repository writes |

The existing browser recovery, shared drafts, validation and stale-write checks are valuable. They should be preserved or improved, not replaced by localStorage-only saving.

Two limitations become more significant with a visual editor:

1. Shared drafts currently live in `dashboard-drafts/` in a **public GitHub repository**. Being outside `public/` prevents normal website publication but does not make GitHub draft content private. Frequent draft/image commits can also trigger Git-linked builds. Private draft storage is the recommended next layer.
2. Publishing currently writes one content file and clears its shared draft in a separate operation. A visual page release may depend on several documents and assets. It needs an atomic content snapshot and one Git commit, followed by separate draft-state reconciliation. [S1–S3]

The prior deployment review also observed an Airtable configuration error and a Vercel management-access restriction for the `carol-cilliers` scope. Those historical findings were not retested in this planning review. They are prerequisites to recheck before claiming complete integration tests or protected deployment management. Successful Git-triggered deployment does not imply that the dashboard service has all necessary Vercel API permissions.

## 6. Proposed layers and boundaries

### Layer A — dashboard shell

Add **Page editor** before About and Settings, keeping Settings last. The editor opens a focused workspace with the same brand, typography and accessible control styling as the dashboard. Compile a React editor bundle as an isolated dashboard feature; do not rewrite the existing dashboard or public site into Next.js just to host it.

Load that bundle only when needed. Scope/reset its styles so Tailwind or editor CSS cannot restyle other dashboard pages. The editor must not install global shortcuts while inactive or hijack typing in form fields.

### Layer B — canonical page model

Use a Sane Living-owned, runtime-validated format rather than making an upstream application’s entire project state permanent.

| Model field | Purpose |
| --- | --- |
| Schema version and page ID | Stable identity and explicit migrations |
| Route and page title | Controlled URL mapping and page list |
| Ordered nodes/sections | Visual page composition |
| Node ID, component type and component version | Stable references and compatibility |
| Typed properties | Text, media, links and approved layout choices |
| Bindings | References to global settings or collection data |
| Layout/theme tokens | Semantic spacing, width, color and typography choices |
| Responsive overrides | Explicit, bounded differences from base layout |
| Metadata references/overrides | Integration with the current SEO settings contract |

Revision numbers, draft ownership and publication status belong in backend workflow records. They must not become a second competing “published” boolean inside editable page content.

Use stable UUIDs, bounded nesting and explicit slot rules. Disallow invalid moves such as placing a section inside itself or inserting arbitrary form elements into a protected integration. Preserve unknown supported metadata during adapters; fail safely on unsupported schema versions.

### Layer C — component registry

Each approved component supplies its runtime schema, defaults, inspector fields, allowed child slots, renderer, responsive rules, migration function and test fixtures. One definition should serve editor preview and published page generation.

The first registry should cover hero, rich text, image/text split, gallery, cards, CTA, FAQ, spacer/divider and video/poster. Add dedicated Sane Living components for events, availability, pricing, partners, inquiry forms, booking links, newsletter and shared branding.

Separate **content editing** from **layout editing**. Most staff should change text, media, links, section order and approved variants. An advanced design mode can later expose columns, alignment and constrained spacing. Unrestricted positioning/CSS is a separate requirement, not an incidental checkbox.

### Layer D — rendering and preview

Render page documents into semantic static HTML at build time. Preserve useful existing browser interactions as small approved scripts rather than shipping the entire editor to visitors. Compile CSS locally. Verify that the editor preview, full-page preview and deployed page share the same rendering rules and assets.

Use a genuine preview viewport for CSS behavior. Merely shrinking a `<div>` can misrepresent media queries. Support 375px, 768px and desktop widths with freely adjustable width, keyboard access and visible overflow checks.

Choose preview isolation deliberately: a frame is useful for page CSS isolation, but it is not automatically a security boundary. For trusted structured components, use only approved rendering/scripts and no executable user HTML. Any future arbitrary HTML mode requires a separate origin and a message bridge with strict origin/message validation, without dashboard cookies or secrets.

### Layer E — private authoring services

Use a small private draft database plus private staged-media storage behind authenticated APIs. Published page documents remain in GitHub. Suggested records are pages, draft revisions, asset manifests, publication jobs and audit events.

This adds a service dependency, but avoids public drafts, excessive Git history and a deploy for every autosave. Select a provider only after checking the owner’s current accounts, quotas, backup requirements and acceptable cost. No new provider subscription is assumed by this plan.

If external storage is postponed, the existing Git draft workflow can support a deliberately limited pilot. It must be labeled public-repository draft storage, use explicit saves, and skip draft-only builds where configured. A branch in a public repository would not solve draft privacy.

### Layer F — publishing and deployment tracking

The server validates an immutable snapshot, commits its approved published documents/assets to GitHub, and records the resulting commit. Vercel builds the complete existing project. Track the exact deployment for that commit and verify the production content before reporting it live.

GitHub, Vercel and draft storage form a workflow with recoverable steps; they are not one database transaction. Record progress durably so retries reconcile completed work rather than repeating it blindly.

## 7. How staff would use it

1. Open Page editor and choose a page. Show its public route, last live release and draft owner/status.
2. Click a section on the canvas or in Layers. Show Content, Layout and Style controls appropriate to that component.
3. Edit text in a polished rich-text field or approved inline field; replace media through the asset picker; drag sections using clear insertion positions.
4. Undo/redo locally. Keyboard users can move sections with buttons or accessible drag controls.
5. Show **Changes on this device**, **Saving draft**, **Draft saved**, or a persistent error. An explicit Save draft button remains available even with autosave.
6. Preview the complete page at mobile/tablet/desktop widths. Preview blocks real submissions and bookings unless the user explicitly opens the live integration.
7. Publish opens a concise review: affected page(s), global changes, missing required fields, broken links and selected draft revision. It publishes the reviewed snapshot, not later typing.
8. Show **Committed → Building → Checking → Live**, with a clear failure/retry state and the release link.

Use generous labels and readable fields rather than tiny icon-only panels. Keep primary actions predictable. Avoid decorative button styling that makes ordinary navigation harder to read. On smaller screens, collapse panels into drawers; establish during the pilot which layout tools are practical on phones. Do not claim that desktop preview alone proves mobile editing works.

## 8. Keeping settings and functional content consistent

**One owner per field is essential.** The visual editor and existing forms can offer two interfaces to the same content, but they cannot maintain independent copies.

- Global logo/favicon/contact values bind to Settings. Selecting a logo on the canvas offers “Edit global branding,” with the affected scope shown.
- About’s current text remains canonical during the initial adapter phase. Introduce stable section IDs deliberately, preserving existing fields and hidden sections. New layout records reference those IDs. If a later migration moves About to the page model, switch both interfaces together and retire the old writer.
- Home heading/intro/CTA fields already exist in Settings. During migration, bind their visual fields to those settings rather than saving duplicate strings in the page document. A later move requires a versioned migration and one canonical writer.
- An Events block stores presentation options and a reference to the existing source. Dragging it does not copy event records into page JSON. Record edits still use the Events section.
- A gallery block references the gallery collection and preserves per-photo draft behavior. Global publication must not accidentally reveal every staged photo.
- Booking, contact, newsletter, map and availability blocks use existing validated destinations and adapters. A configured-looking form without a working destination cannot publish as “ready.”
- Shared header/footer components use global navigation and branding. Page-local overrides, if eventually allowed, must be explicitly named and resettable.

Avoid deriving component identity from headings or DOM selectors that a redesign can change. Semantic IDs and field keys are the durable contract.

## 9. Save, conflict and publish protocol

### Saving drafts

Use debounced autosave to a private revisioned draft record plus explicit Save draft. Each request includes page ID, expected draft revision and the published baseline. The server checks authorization and schema shape before accepting it. Local recovery is a fallback; it must never be labeled a shared save.

Keep changes typed during an in-flight save dirty after the earlier snapshot succeeds. Retain recovery after network failure. On stale revisions, show the competing revision and preserve the user’s work. Start with revision conflicts and an optional editing-presence/lease indicator; real-time collaborative cursors and CRDT merging are later features.

### Publishing directly to main

1. Create a publication job with a unique idempotency key and immutable draft/settings/media revisions.
2. Validate runtime schemas, allowed routes, component versions, links, assets, required integrations and accessibility basics. The server owns repository paths and renderer behavior.
3. Read current `main` and check all affected content baselines. Assemble the release against that current head, preserving unrelated files.
4. Run a deterministic preflight render. Full browser/build checks can execute in an isolated worker or CI job; avoid long synchronous builds inside the interactive save request.
5. Create all necessary Git blobs/tree entries and one commit, then advance `main` with a non-force update. If another commit wins the race, reload/revalidate and rebuild against the new head. Never force-push or silently overwrite changed content. GitHub’s non-force ref update guards fast-forward history; it is not by itself a per-field merge strategy. [D1]
6. Record the accepted commit SHA. If the response is lost after GitHub accepts it, reconcile the job using that release identity before retrying.
7. Allow the existing Git/Vercel integration to build the complete site. Do not separately invoke OpenPage’s standalone production deploy endpoint. Production-branch pushes trigger production deployments under Vercel’s configured Git flow. [D2]
8. Match status to the exact commit/deployment, then verify a build-generated release marker and page content on the production URL. A GitHub commit or newly returned deployment URL alone does not prove the production alias serves the change.
9. Mark Live only after verification. Clear/archive only the published draft revision; keep newer edits made while publishing.

Draft-only changes should not trigger production builds. With private draft storage they do not touch the production repository. If retaining temporary Git drafts, configure and test ignored-build behavior carefully so genuine content and application changes still deploy. [D3]

### Failures and rollback

| Failure | Required behavior |
| --- | --- |
| GitHub denies write | Keep draft; show status and returned restriction safely; distinguish token scope, repository selection and branch/ruleset rejection where evidence permits |
| Conflicting edit | Preserve both versions; no silent overwrite; require reconciliation |
| Request timeout after commit | Recover the existing publication job; avoid duplicate releases |
| Build fails | Report committed/build failed; retain access to the last working live release; do not claim publication succeeded |
| A newer release supersedes this one | Show superseded status; do not incorrectly label an older job as current live |
| Draft cleanup fails | Keep the successful release; retry cleanup independently without deleting newer edits |
| Rollback requested | Create a new content-restoration commit against current main; preserve unrelated subsequent changes |

An emergency Vercel rollback may restore visitors’ experience, but must be reconciled with GitHub so the next deployment does not unexpectedly reintroduce the reverted content. Verify that the selected hosting permissions and plan support the intended rollback/protection workflow before promising it in the UI.

## 10. Assets, authorization and safeguards

### Assets

Build on the current upload validation and unique filenames. Add a media library with alt text, dimensions, size limits, cropping/focal point and reference tracking. Use immutable names/content hashes. Keep staged files private until release; promote selected assets and their references as one publication snapshot. Do not delete old assets while published revisions or retained rollback snapshots still reference them.

Maintain separate draft and published URLs through an asset ID mapping. Validate image signatures and decoded dimensions. Keep the current SVG/video upload restrictions unless a separately reviewed pipeline is added. Larger videos should use a deliberately selected media pipeline rather than growing Git history with every edit.

### Authorization

The current shared staff credential cannot establish which person owns a page or who published a revision. Introduce individual identities and server-enforced roles before promising personal page ownership or per-user auditing. Proposed roles: contributor edits assigned pages/drafts; publisher releases assigned content; administrator manages global branding, page permissions and integrations. The exact staffing model is a decision for the team.

The dashboard’s GitHub credential is separate from this chat’s connected GitHub account. The future server needs its own narrowly scoped repository write access; staff should never paste GitHub or Vercel tokens into page settings. Vercel status/preview administration similarly needs a server-side grant to the correct team/project.

Validate every mutation server-side, including operations originating in the visual editor or future AI. Add CSRF/origin defenses for cookie-authenticated writes, request limits and durable publication throttling. An in-memory rate-limit map alone is not a reliable shared limit across serverless instances.

### Content and runtime safety

Use a safe rich-text document format and allowlisted tags/marks. Validate URL schemes, embed hosts, CSS token values and layout bounds. No arbitrary JavaScript, inline event attributes, external script injection or repository/config path editing for normal staff. Unknown components should block publication with a helpful message rather than quietly render an incomplete page.

Protect reserved routes such as `/api`, `/dash`, `/admin` and asset/config paths. New-page routing needs unique slugs, case/trailing-slash normalization and redirect handling. Prefer approved template routes generated from a manifest; do not let a text input edit `vercel.json` freely.

## 11. Migration strategy for the redesign

Do not attempt an automatic round-trip importer for the entire live DOM. First inventory pages and identify their content, styling, scripts and integrations. Mark each as template-ready, integration-heavy or custom/legacy.

Use a developer-controlled conversion for the first page. Preserve its URL, content, media, metadata and functional links. Keep a legacy renderer available until the replacement is verified. Generated HTML is an output; staff edits target its source content/document.

| Stage | Page coverage | Purpose |
| --- | --- | --- |
| Technical proof | Private sample plus a copy of About | Test editor core, source adapters and rendering without changing public pages |
| First release | About or another agreed simple content page | Complete save/preview/publish/restore with real team use |
| Content rollout | Editorial and simple landing pages | Expand approved blocks and templates |
| Integration rollout | Gallery, pricing, partners, contact | Preserve collections and prove working actions |
| Complex rollout | Home, events and booking-heavy pages | Test global dependencies, live data and redesign behavior |

The redesign should supply component variants and shared design tokens. Existing content IDs/settings keys survive. When a component changes structurally, add a component migration; when it only changes visually, update the renderer/variant. Release renderer and content-model changes compatibly so saved drafts remain readable.

New campaign pages can follow once routing and template validation exist. Personal microsites and arbitrary page code remain separate scope decisions.

## 12. Development phases and acceptance gates

These are planning ranges for one experienced developer, excluding owner decisions, service provisioning and major frontend design work. They are not a fixed delivery quote. Re-estimate after Phase 1; whole-site migration depends heavily on how custom the redesign becomes.

| Phase | Deliverable | Acceptance gate | Initial effort range |
| --- | --- | --- | --- |
| 0 — contracts | Page inventory, ownership map, schema proposal, permissions/storage decision and redesign component list | One canonical owner per field; agreed pilot page and publication scope | 1–2 working days |
| 1 — technical proof | Isolated OpenPage-derived editor slice with Sane Living sample blocks; no live writes | Add/edit/reorder, keyboard operations, undo, responsive behavior and identical preview/build output demonstrated | 3–5 days |
| 2 — authoring backend | Private drafts, asset staging, revision checks, recovery and individual identity integration | Cross-device save, stale-write rejection, failed-save retry and unauthorized access tests pass | 4–7 days |
| 3 — publication | Atomic Git content commit, durable job status, deployment correlation and restore | A test release can publish, fail safely, recover after timeout and restore without erasing unrelated work | 3–5 days |
| 4 — pilot page | One existing page migrated with current settings/content adapters and polished controls | Staff complete ordinary edits without AI; public route/content/functions preserved | 3–5 days |
| 5 — broader rollout | Approved components and pages migrated in batches | Each route passes functional, visual and SEO checks before cutover | Estimate after inventory |

The first four development phases after contracts are roughly **13–22 working days**, plus Phase 0 and wider migration. A smaller demo can be faster, but would not demonstrate the full shared-draft, asset, conflict and publishing system described here. Advanced nested design tools, arbitrary HTML import and real-time collaboration extend the scope.

### The Phase 1 go/no-go test

Retain OpenPage as the core only if a small extraction can:

- Render a Sane Living hero, rich-text section and functional-component placeholder without pulling in its full project dashboard, AI generation and deployment system.
- Edit properties and reorder sections with mouse and keyboard while preserving IDs and undo state.
- Produce matching full-page preview and static output at mobile/tablet/desktop widths.
- Keep CSS and shortcuts isolated from the existing dashboard.
- Use typed runtime schemas rather than trusting arbitrary block properties.
- Leave a clear path for controlled nested slots if the redesign needs them.

If extraction proves more expensive than its reusable value, retain the page contract and replace only the editor adapter. Compare a small custom block shell and a separately evaluated HTML-editing option. No external alternative is presumed validated by this assessment.

## 13. Verification required before launch

| Area | Essential scenarios |
| --- | --- |
| Content preservation | About hidden sections/unknown metadata; cleared values; Unicode, pasted formatting, long content |
| Editing | Add/duplicate/remove/reorder; undo/redo grouping; selection; invalid nesting; keyboard alternatives |
| Recovery/concurrency | Refresh, offline edits, failed save, edit during save, two browsers, two publishers, cross-page/global dependency changes |
| Preview parity | Same snapshot/component versions/assets/CSS in editor, preview and deployed output |
| Publishing | One complete commit; main advances during publish; accepted commit with lost response; build failure; superseded deploy; status timeout |
| Functional blocks | Real event reads; approved test event writes; booking/contact/newsletter destinations; gallery draft flags; mobile navigation |
| Security | Page/role authorization, CSRF, forbidden routes/paths, script/URL injection, file signatures, oversized requests and private preview access |
| Routing/SEO | Existing rewrites/redirects, new slug collisions, canonical URL, static title/description/share image/favicon, sitemap updates |
| Assets | Missing/staged images, broken URLs, alt text, oversized images, replacement and rollback references |
| Accessibility | Labels, contrast, focus, screen-reader announcements, rich-text keyboard use, reduced motion and responsive controls |
| Rollback | Restore a selected content release while preserving unrelated newer code and other page changes |

Reuse and extend the existing Sane Living content/API/browser test suite. Use isolated GitHub/Airtable fixtures for destructive scenarios. Production event writes and real form submissions need specifically agreed test records/destinations; a cosmetic success message is not an integration test.

## 14. Decisions for reassessment

The architecture can be reviewed now without choosing every detail. The most consequential decisions are:

1. **Editing freedom:** approved sections and controlled layouts first, or immediate unrestricted element design? Recommended: sections first, nested layout tools only where needed.
2. **Page ownership:** shared site editors or individually assigned personal pages? Recommended initial scope: shared site pages with explicit permissions.
3. **Draft infrastructure:** approve private storage and individual identities, or accept a limited pilot using today’s public-repository drafts? Recommended production direction: private authoring storage.
4. **Pilot page:** About or one new landing-page template? Recommended: private proof using About content, then a single agreed existing-page release.
5. **Release scope:** one page plus its necessary dependencies, or a sitewide release bundle? Recommended: explicit page releases, with a clear warning/review when global settings are included.
6. **Design timing:** which redesigned components are stable enough to register now? Build the content and publishing contracts first; avoid duplicating temporary frontend layouts across dozens of blocks.

The next development authorization should cover a technical proof with the acceptance gate above. That proof should determine the core choice before a broad fork, whole-dashboard rewrite or sitewide migration.

## 15. Source index

All repository links below pin the inspected commit. They support the observed-source findings; architecture recommendations and effort estimates are my judgments.

### OpenPage

- **O1:** [README and license](https://github.com/buildingopen/openpage/tree/9818eb43a88e01b23cb55752e19902d8285a853b), [package manifest](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/package.json).
- **O2:** [Block/page types](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/blocks/types.ts), [registry](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/blocks/registry.tsx), [layers and drag sensors](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/editor/LayersPanel.tsx).
- **O3:** [Config, persistence and undo](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/store/configStore.ts), [project store](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/store/projectsStore.ts), [autosave](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/editor/EditorLayout.tsx).
- **O4:** [Canvas](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/editor/Canvas.tsx), [version history](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/editor/VersionHistory.tsx), [block selection/actions](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/blocks/BlockWrapper.tsx).
- **O5:** [HTML exporter](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/lib/export-html.ts), [export tests](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/tests/export-html.test.ts).
- **O6:** [Publish client](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/lib/publish-site.ts), [deployment handler](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/api/deploy.ts), [deployment checks](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/api/lib/deploy-security.ts).
- **O7:** [Contact block](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/blocks/contact/ContactBlock.tsx), [newsletter block](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/blocks/newsletter/NewsletterBlock.tsx).
- **O8:** [Hero canvas renderer](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/blocks/hero/HeroBlock.tsx), [properties panel](https://github.com/buildingopen/openpage/blob/9818eb43a88e01b23cb55752e19902d8285a853b/src/editor/PropertiesPanel.tsx).

### Framely

- **F1:** [README](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/README.md), [package manifest](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/package.json), [MIT license](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/LICENSE).
- **F2:** [Editor model/reducer](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/src/app/providers/editor-provider.tsx), [recursive renderer](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/src/app/components/editor/site-editor/editor-components/recursive.tsx).
- **F3:** [Database schema](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/prisma/schema.prisma), [server actions](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/src/lib/actions/page.ts).
- **F4:** [Save/visibility controls](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/src/app/components/editor/editor-navigation.tsx), [editor/mobile behavior](https://github.com/belastrittmatter/Framely/blob/943d254020710560da36e9afc328c49269c00f6c/src/app/components/editor/site-editor/index.tsx).

### Visual Composer

- **V1:** [README](https://github.com/VisualComposer/builder/blob/29374072a05b47f86090dac29825af9665b01048/README.md), [contribution/build guide](https://github.com/VisualComposer/builder/blob/29374072a05b47f86090dac29825af9665b01048/CONTRIBUTING.md).
- **V2:** [WordPress save controller](https://github.com/VisualComposer/builder/blob/29374072a05b47f86090dac29825af9665b01048/public/editor/stores/wordpressData/lib/saveController.js).
- **V3:** [Backend post-save hooks](https://github.com/VisualComposer/builder/blob/29374072a05b47f86090dac29825af9665b01048/visualcomposer/Modules/Editors/Backend/SaveSetEditorController.php), [plugin entry](https://github.com/VisualComposer/builder/blob/29374072a05b47f86090dac29825af9665b01048/plugin-wordpress.php).
- **V4:** [Root license](https://github.com/VisualComposer/builder/blob/29374072a05b47f86090dac29825af9665b01048/LICENSE), [package license declaration](https://github.com/VisualComposer/builder/blob/29374072a05b47f86090dac29825af9665b01048/package.json).

### Piper

- **P1:** [README](https://github.com/fireyy/piper/blob/55f254709184991d26d37327e6408a9cedfc7654/README.md), [manifest](https://github.com/fireyy/piper/blob/55f254709184991d26d37327e6408a9cedfc7654/package.json), [root tree](https://github.com/fireyy/piper/tree/55f254709184991d26d37327e6408a9cedfc7654).
- **P2:** [Render state](https://github.com/fireyy/piper/blob/55f254709184991d26d37327e6408a9cedfc7654/src/store/modules/render.js), [drag preview](https://github.com/fireyy/piper/blob/55f254709184991d26d37327e6408a9cedfc7654/src/components/drag-drop.vue).
- **P3:** [Page persistence](https://github.com/fireyy/piper/blob/55f254709184991d26d37327e6408a9cedfc7654/server/controllers/page.js).
- **P4:** [Publishing controller](https://github.com/fireyy/piper/blob/55f254709184991d26d37327e6408a9cedfc7654/server/controllers/publish.js), [Qiniu adapter selection](https://github.com/fireyy/piper/blob/55f254709184991d26d37327e6408a9cedfc7654/server/lib/publish/index.js).

### website-editor / VvvebJs

- **W1:** [README](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/README.md), [manifest/provenance](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/package.json).
- **W2:** [DOM editor/export/save client](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/libs/builder/builder.js), [undo manager](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/libs/builder/undo.js).
- **W3:** [Example save handler](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/save.php).
- **W4:** [Example upload handler](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/upload.php).
- **W5:** [Apache license](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/LICENSE), [third-party credits](https://github.com/mars9541/website-editor/blob/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6/Credits.md).

### Sane Living and platform documentation

- **S1:** [Current content-studio contract](https://github.com/carolcilliers/sane-living-website-live/blob/3e020ae628ae609345d3906a5d8180d293fd05ff/docs/CONTENT_STUDIO.md).
- **S2:** [Content repository helpers](https://github.com/carolcilliers/sane-living-website-live/blob/3e020ae628ae609345d3906a5d8180d293fd05ff/api/_contentlib.js).
- **S3:** [Authenticated draft/publish/upload handler](https://github.com/carolcilliers/sane-living-website-live/blob/3e020ae628ae609345d3906a5d8180d293fd05ff/api/dash-save.js).
- **S4:** [Content build](https://github.com/carolcilliers/sane-living-website-live/blob/3e020ae628ae609345d3906a5d8180d293fd05ff/scripts/build-content.cjs), [routes and deployment configuration](https://github.com/carolcilliers/sane-living-website-live/blob/3e020ae628ae609345d3906a5d8180d293fd05ff/vercel.json).
- **D1:** [GitHub REST: Git references](https://docs.github.com/en/rest/git/refs).
- **D2:** [Vercel Git deployments](https://vercel.com/docs/git), [GitHub integration](https://vercel.com/docs/git/vercel-for-github).
- **D3:** [Vercel project settings and ignored builds](https://vercel.com/docs/project-configuration/project-settings), [ignored-build guide](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel).

