# Sane Living content studio

## The editing contract

The public website consumes published files in `public/content/`. A redesign can change the layout without changing the field keys, upload paths, draft storage or save API.

- **Settings:** `public/content/settings.json`. Defaults, categories, URL validation and schema version live in `public/site-config.js` (shared by browser, API and build).
- **About:** `public/content/about.md`. YAML frontmatter holds the title and section list. The dashboard presents ordinary text fields; `public/content-model.js` parses and serializes the source with vendored js-yaml 4.1.0. Unknown metadata and section fields survive edits. Optional Markdown after the frontmatter is preserved. `visible: false` keeps a section saved without rendering it. The existing Farm source starts hidden, matching its previous absence from the public page.
- Gallery, Weddings, Pricing and Partners keep their existing JSON paths. Photos retain their per-photo `draft` flag. Publishing gallery changes does not automatically reveal photos still marked unpublished.
- **Events remain in Airtable**, using the existing `/api/dash-events` and public calendar endpoints. Event form recovery is local to the device; saving an unpublished event creates/updates the Airtable record without publishing it.

## Save and publish states

1. Editing stores a recovery copy in browser localStorage. This is device recovery, not a team save. If storage is unavailable, the status explicitly asks the editor to save a shared draft.
2. **Save draft** writes `dashboard-drafts/<section>.json` outside the deployed public directory. The draft is shared with authenticated dashboard users and survives refresh/device changes. It does not change the published content file. These files live in the Git repository; do not use drafts to store secrets or private personal data.
3. **Publish changes** validates the snapshot and updates its public content file. Deployment follows the Git commit. The UI says deployment is updating, rather than claiming the website is instantly live.
4. **Revert** discards the shared draft and restores published content after confirmation. A local backup is kept when storage is available.

Both saving and publishing check the published file SHA and the shared draft SHA. Stale writes return 409. The UI keeps the editor's work and offers to load the current published version; it never silently overwrites a newer revision. Changes made while a save is running remain unsaved after that snapshot finishes. Failed requests retain the recovery copy and display a persistent error.

All `dash-content` and `dash-save` responses are private/no-store. Every request requires the existing signed staff session cookie. `CMS_GITHUB_TOKEN` stays server-side and needs Contents read/write on this repository. `DASH_BRANCH` defaults to main.

## API

- `GET /api/dash-content?section=settings` (or gallery, weddings, pricing, partners, about): returns published content/SHA and the optional shared draft/SHA/base SHA.
- `POST /api/dash-save`: `{path, action: "draft" | "publish" | "discard", content, expectedSha, expectedDraftSha}`. Discard does not require content. Null versions represent absent files.
- Image upload: `{path: "public/images/<unique-name>.png", contentBase64}`. PNG, JPEG, WebP, GIF and ICO are accepted, up to 4 MB, with extension/signature checks. Existing assets cannot be overwritten. Uploading stages a new asset; it does not select it on the website until the referencing settings/content are published. SVG uploads and video uploads are intentionally not accepted; use a published video URL/path. The bundled SVG favicon is a fixed local asset.

## Redesign integration

Load `/site-config.js` and `/site-content.js` in public pages. `window.SaneSite.ready` resolves to validated published settings. New markup can opt into these hooks:

| Hook | Behavior |
| --- | --- |
| `data-site-text="homeHeading"` | Inserts a text setting using textContent |
| `data-site-href="homePrimaryUrl"` | Applies a validated link |
| `data-site-src="logoUrl"` or `data-site-logo` | Applies a published image/logo |
| `data-site-booking` | Booking destination |
| `data-site-availability` | Existing Airtable availability embed destination |
| `data-site-map` / `data-site-inquiry` / `data-site-rental-inquiry` | Map, contact inquiry and rental inquiry embed destinations |
| `data-site-email` | Contact email and mailto link |
| `data-site-hero-video` | Homepage video and poster; blank video URL selects image mode |

The current shared navigation/footer are adapted by `site-content.js`; a new layout can replace those adapter functions while keeping the settings contract. Navigation settings rename/reorder/hide existing routes and preserve their dropdowns. They do not create or remove pages. Airtable embed settings do not change the event API source, base ID, table or publish filter.

`npm run build` runs `scripts/build-content.cjs`. It generates the published About page and writes favicon, search and sharing metadata directly into all marketing-page HTML, so crawlers do not depend on client JavaScript. `public/content/page-defaults.json` preserves the baseline titles/descriptions when overrides are cleared. Update those defaults when redesigning the page copy. About's existing philosophy block is kept in `templates/about-philosophy.html` and rendered after the founder section; the template survives section removal/reordering. Keep the `about-managed` markers if retaining that build renderer, or replace it with the new design's own rendering against the same content model.

Mailchimp actions, Google Maps embeds and Airtable embeds are URL validated; raw script snippets and service credentials are not editable settings.

## Verification

- `node tests/content-api.cjs`: authentication, file allowlist, versions, draft isolation, publication cleanup, revert, image validation.
- `node tests/studio-flow.cjs`: all dashboard sections at 375/768/1024/1440, refresh recovery, shared drafts in a separate browser session, retry after failure, About publication, conflict handling.
- `node tests/studio-settings.cjs`: settings categories, staged favicon uploads, frontend settings hooks, static SEO output, edits during an in-flight save, event form recovery.

Tests use actual content API handlers against an isolated in-memory GitHub adapter and a temporary published-site copy. Event UI tests simulate Airtable responses; production calendar code is unchanged. Run `npm install` and `npx playwright install chromium` to set up the browser tests. Browser tests need Playwright and a Chromium executable (`CHROMIUM_EXECUTABLE_PATH`, or `/tmp/sane-chromium` in the authoring environment). No test writes to the live repository or Airtable.
