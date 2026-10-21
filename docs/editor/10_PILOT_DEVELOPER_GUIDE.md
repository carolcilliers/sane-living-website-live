# Next-stage developer guide — local editor proof

This is the bounded next implementation brief. It does not authorize a production push, deployment, provider installation or live record mutation. Start it only in an implementation stage; the current package is documentation.

## Objective

Determine whether a small OpenPage-derived editor can edit Sane Living content through a stable model and render exactly the same selected snapshot in preview and build output. Prove the foundation before building production storage or migrating the whole site.

## Read these first

1. Current repository `CLAUDE.md` and `docs/CONTENT_STUDIO.md`, resolving stale notes against source.
2. Handoff README, architecture, content contract and verification matrix.
3. OpenPage source at `9818eb43a88e01b23cb55752e19902d8285a853b`: registry/types, config store, LayersPanel, BlockWrapper, Canvas and property controls.
4. About source/model/build, current settings validators/hooks, route manifest and dashboard save-state code.

Do not rescan all five upstream applications. The prior assessment and reuse register explain why the others are references, not required dependencies. Recheck the selected upstream head and review diffs before taking newer code.

## Inputs

- Current source baseline plus intervening main changes.
- Synthetic page example/schema in this package.
- Copy of About frontmatter/Markdown including hidden section and suffix fixtures; never production credentials or private records.
- Three initial components: `sane.hero`, `sane.richText` or Markdown-backed equivalent, `sane.aboutSections`; an inert functional-block placeholder for integration scope.

## Required outputs

- A local-only editor development entrypoint, with a repeatable start command added during implementation.
- Runtime validation plus explicit semantic binding/slot rules.
- Sane Living model adapter separate from UI state/history.
- Single shared renderer producing preview and static output with locally compiled CSS.
- Mouse/keyboard reorder, edit, duplicate/remove, undo/redo and visible local save/recovery states using fake API fixtures.
- Test report at 375/768/1024/1440 plus arbitrary width; existing dashboard style/shortcut isolation evidence.
- Extraction/provenance record listing copied files, modifications, licenses and excluded upstream services.
- A measured core decision: keep OpenPage slice, narrow it further or replace its UI adapter.

## Constraints

- No GitHub content API writes, no Vercel deployments, no Airtable writes, no real newsletter/form submissions.
- Do not alter current public route ownership. Generated proof output stays in a separate temporary/local artifact directory.
- Do not put draft JSON or signed previews into served `public/` under the assumption that obscure paths are private.
- No OpenPage standalone deployment handler, fake contact success toast or client-stored deployment key.
- Do not merge the editor's state machine into existing dashboard global state without a mount/unmount adapter.
- Preserve About unknown metadata, hidden sections and suffix; unsupported text is read-only/preserved rather than silently dropped.

## Proof scenarios

1. Open fixture; page/section IDs remain unchanged after edits.
2. Change text and image/alt values; compare source mutation and rendered output.
3. Reorder sections using drag and keyboard; undo/redo restores exact content order.
4. Switch viewport; inspect actual iframe dimensions and CSS breakpoints.
5. Render static output from the same snapshot; compare semantic structure/content and visual screenshots after normalizing editor overlays only.
6. Try unsafe URLs, duplicate IDs, invalid binding keys, unsupported component version and invalid child slot; server-equivalent validator rejects.
7. Simulate failed save, refresh, later typing during save and stale revision response; work remains recoverable and state truthful.
8. Mount/unmount editor and visit every existing dashboard section; no lingering shortcuts/style changes.

## Stop conditions

Stop expansion if preview/export need independent renderer implementations, extraction pulls in a second auth/database/platform, content round trips lose data, the UI requires unbounded arbitrary CSS, or accessibility/selection/dragging cannot be made reliable within the proof. Report the failed condition and smallest alternative; do not conceal it by changing the data contract without review.

## Final proof report

Include head SHA; local start/test commands; copied upstream source files/notices; components and schema versions; passed/failed scenarios; screenshots if useful; measured bundle/build behavior; limitations; and a revised backlog/estimate. Distinguish implemented fake saves from real shared drafts and production publication. Do not claim live integration merely because a local page renders.

## Ready-to-use handoff instruction

> Implement only E01–E03 from this package in the current Sane Living repository workspace. Refresh main, preserve existing routes, dashboard sections, content contracts and Airtable behavior. Build a local-only OpenPage-derived editor proof using synthetic/copied About fixtures, a Sane Living-owned schema/adapter and one shared preview/static renderer. No branches/PRs, production pushes, deployments, real service writes or new provider provisioning. Validate editing, keyboard reorder, undo, content preservation, save failure/recovery and responsive parity; record source provenance and return a core go/no-go report before expanding the scope.

The instruction intentionally bounds the next stage. A later task can explicitly authorize production publication once the relevant gates and owner decisions are satisfied.

