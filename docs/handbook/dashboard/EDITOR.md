# Page Editor and About — implementation rulebook

## Read first and implementation truth

This is a structured website editor embedded at `/dash/#editor`, not an installed copy of Webstudio, Instatic, WordPress or Framer. Do not claim full feature parity. Read `docs/editor/START_HERE.md`, `IMPLEMENTATION_STATUS.md`, `14_WEBSITE_STUDIO_GUIDE.md`, `15_ELEMENT_EDITING_AND_DRAFT_RECOVERY.md`, and the numbered contract covering the intended change. Existing source/reuse provenance is in `12_REUSE_AND_SOURCE_REGISTER.md`.

The dashboard iframe host keeps the sidebar visible. Native dashboard CSS/appearance never enters the website canvas. The editor has its own dark/light controls. About is part of Page Editor; the old standalone About alias redirects into it. Settings stays last in navigation. Do not reintroduce a duplicate editor destination or standalone About content fork.

## Runtime and source map

React/TypeScript source: editor/src. Vite config: editor/vite.config.mjs. Build output: public/dash/editor, generated and ignored. The website document model, design rules and source renderer are shared through content-core and related public model modules. Page registrations and trusted HTML captures live in content/page-templates.json. Actual source HTML still lives under public/; Vercel rewrite rules determine routes.

The canvas must display the current website, including newly deployed source changes from other authorized agents. Bootstrap pins repository reads to a single head and checks the deployed template registry. Source synchronization waits for matching deployment, refreshes clean work, and protects working drafts instead of replacing them. Image discovery comes from repository assets. A manual refresh must not become the only path to seeing new source assets.

Canonical native content and Page Editor layouts have different owners. Do not flatten About frontmatter, settings, gallery groups or wedding/pricing values into arbitrary layout text. Follow connection/ownership indicators. New eventStories is a supplemental canonical resource; preserve its version and do not modify it to satisfy an unrelated layout edit.

## Authoring and interaction rules

Selection, free movement, flow reordering and resize are distinct modes. Selecting another mode deactivates the previous mode; selecting another element must not leave an unrelated tool permanently active. Keep toolbar position deliberate, draggable and closeable; do not jump over the selected content on every click. Preserve panel resizing and the header page chooser.

Insert at the selected boundary/container, not at the end of the page. Preserve valid section → row/column → element relationships, stable element IDs, source IDs, media wrappers and link/button semantics. Do not move an image out of its frame accidentally. Image removal and whole-section deletion must be separate actions. Guide lines, snapping, undo/redo and keyboard behavior need actual geometry/state-path tests, not labels for unimplemented controls. Read 19–23 in docs/editor for the existing layout, sizing, insertion, positioning and tool contracts.

Avoid remounting/rebuilding the entire iframe for every inspector input or pointer move. Update targeted state and render work; preserve focus, scroll, selection and stable interaction targets. Existing camera/source/media behaviors and canonical scripts must survive. A safe new component requires schema validation, renderer support, inspector controls, preview/publication support and tests; adding an insert-menu button alone is incomplete.

## Save, preview and publication

Private draft/recovery assets and immutable preview snapshots use IndexedDB. Save is not Publish. Preview opens the reviewed draft in its own page without changing public content. Preserve staged images, responsiveness, source-version checks and recovery. Do not expose a protected deployment as a supposedly public preview, bypass production authentication or disable access protection globally.

Publication is performed by the authenticated studio service using a validated reviewed snapshot and a non-force Git commit. It must preserve source SHA guards, canonical content ownership and active-template migration rules. An accepted commit, successful build and verified live result are different states. Concurrent GitHub redesigns or native saves must not be silently overwritten by a stale layout snapshot. Do not retry with a substituted current base SHA without rebasing/reviewing the actual document.

About's source is public/content/about.md. Keep unknown frontmatter and trailing Markdown. Existing philosophy rendering/template is separately authored; no accidental deletion when reordering/removing About sections. Existing site-config keys, route scripts, Airtable integrations and native content schemas remain stable during frontend redesign.

## Development and verification

Use `npm run dev:editor` for isolated fixtures. Run typecheck, relevant editor contracts/geometry/tool/recovery/publisher/browser tests, and build. Keep fixture/test layouts and release descriptors out of main. Inspect multiple pages and both viewport modes, not just one selected button. A test on an outdated source selector is not proof that a user flow works; investigate baseline failures and update legitimate source-dependent selectors without weakening geometry/data safety assertions.

For source-template edits, read 07_MIGRATION_AND_ROLLBACK, 08_VERIFICATION_AND_RELEASE_GATES and 21_EXACT_INSERTION_AND_STABLE_MOVEMENT. For backend changes, read 04_API_AND_STORAGE_CONTRACT and 05_PUBLICATION_PROTOCOL. For staff handoff, use 13_TEAM_WORKFLOW_GUIDE. Finish with a source/ownership manifest, actual validation evidence, remaining limitations and verified deployment SHA. Do not promise exactly-once or database durability that the installed architecture does not provide.
