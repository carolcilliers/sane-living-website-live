# Sane Living editor — next-stage handoff

Read [14_WEBSITE_STUDIO_GUIDE.md](14_WEBSITE_STUDIO_GUIDE.md) first for the current implemented profile. The original planning sequence below remains reference material.

Prepared October 20, 2026 • Documentation only

The development package is ready for a bounded local editor proof. It contains architecture decisions, current-source inventories, content/API/storage contracts, publication and rollback protocols, a dependency-ordered implementation backlog, test gates, developer instructions and a proposed team workflow guide.

The target remains `carolcilliers/sane-living-website-live`, main at `3e020ae628ae609345d3906a5d8180d293fd05ff`. All five upstream heads were refreshed and remain the versions in the original assessment.

## Architectural direction

Use a small OpenPage-derived editor UI around a Sane Living-owned page model. Keep one canonical source for each field, one shared preview/static renderer, one write gateway and one GitHub/Vercel publication workflow. Preserve the existing static website, dashboard and Airtable sources while migrating one route at a time.

Global branding stays in Settings. About content stays in its current Markdown/frontmatter source during the adapter phase. Gallery, pricing, partners and weddings retain their collections. Functional blocks bind to the existing events/forms/booking integrations. The visual editor must not create parallel copies of their data.

Private drafts and staged media belong outside the public repository in the target production architecture. Publishing freezes selected revisions, validates them, creates one complete Git commit on main, tracks the exact deployment and verifies live content. Rollback creates a scoped restoration commit that preserves unrelated newer work.

## What is ready

The ZIP contains a root README with a reading order and 13 focused guides:

| Files | Purpose |
| --- | --- |
| `01_CURRENT_SYSTEM.md` | Existing source owners, APIs, integrations and route rules |
| `02_ARCHITECTURE_AND_DECISIONS.md` | Modules, boundaries and decision records |
| `03_CONTENT_AND_COMPONENT_CONTRACT.md` | Page model, stable IDs, bindings and component rules |
| `04_API_AND_STORAGE_CONTRACT.md` | Proposed private records, endpoints, revisions and permissions |
| `05_PUBLICATION_PROTOCOL.md` | Atomic commit, durable jobs, retries and live verification |
| `06_EDITOR_UX_AND_REDESIGN.md` | Editing, accessibility, responsive preview and redesign contract |
| `07_MIGRATION_AND_ROLLBACK.md` | About cutover, old writers, recovery and restoration |
| `08_VERIFICATION_AND_RELEASE_GATES.md` | Acceptance matrix and required evidence |
| `09_IMPLEMENTATION_BACKLOG.md` | Ordered work packages and dependencies |
| `10_PILOT_DEVELOPER_GUIDE.md` | Exact local proof scope and a reusable developer instruction |
| `11_READINESS_AND_OPEN_DECISIONS.md` | Verified findings, infrastructure gaps and decisions |
| `12_REUSE_AND_SOURCE_REGISTER.md` | Upstream reuse/licensing boundaries and pinned evidence |
| `13_TEAM_WORKFLOW_GUIDE.md` | Future staff save/preview/publish instructions |

Supporting folders include two proposed JSON Schemas, synthetic examples, all 25 current marketing-page destinations, the 38 published top-level Settings keys, source hash metadata and the initial repository assessment. `PACKAGE_VALIDATION.md` distinguishes preparation checks from future implementation tests.

## Verification performed

The current content API tests pass against an isolated fetched-source baseline. All 68 research-source files—including three matched supplements—match their GitHub blob hashes. The schema documents/examples and negative structural cases were validated, and package links/inventory consistency were checked. No new browser editor exists yet, and these results are not a claim that the entire future editor is tested.

Read-only live checks found:

- Homepage, dashboard shell and public Settings return HTTP 200.
- Unauthenticated content API access returns HTTP 401.
- Both calendar feeds return HTTP 500: `Airtable configuration missing`.
- Vercel project access returns HTTP 403 because the connection lacks access to scope `carol-cilliers`.

The exact missing Airtable variable cannot be inferred. The Vercel scope restriction does not prove Git-triggered deployments fail; it prevents management inspection/setup through the current connection. These are documented prerequisites for later integration stages, not reasons to block a local fixture-only proof.

## Next development slice

Start only E01–E03 after refreshing the repository baseline:

1. Build an isolated local editor harness using synthetic content and a copy of About.
2. Prove the schema, canonical-field adapters, stable section IDs and shared renderer.
3. Demonstrate selection/edit/reorder, keyboard access, undo/recovery and matching responsive preview/static output.
4. Report whether the OpenPage slice is worth retaining before expanding into production backend work.

No production credentials, Git writes, Vercel deployments, live Airtable mutations, paid provider setup or public route cutover are needed for that proof. Existing public pages remain in legacy mode.

Before production authoring, choose private storage/job services and staff identity/roles, restore the necessary team/environment access, and pass the staged publication/restore gates. The package gives these choices explicit owners/stages instead of silently assuming them complete.

## How to use the package

Extract `Sane_Living_Editor_Development_Package.zip`, open `sane-living-editor-handoff/README.md`, then use the reading order or the pilot guide. The folder is ready to become `docs/editor/` in a future reviewed implementation change. The current task did not commit those documents or modify/deploy the website.

