# Smooth canvas and editor controls

October 22, 2026. Extension to guides 14 and 15; existing content ownership, safe schema and publication protocol remain in force.

## Editing workflow

Use the searchable page dropdown in the editor header. It is the single page selector and contains Create a page. Insert, Layers and page Settings remain inside the dashboard. The insert search now includes Video, List, Quote, Expandable details, Content card and Badge, giving 23 typed blocks. Raster uploads retain the existing staging workflow; videos use a direct MP4/WebM URL or an existing site path, not an image upload.

Click an element to select it. The floating toolbar has a drag grip and Close control. Closing it preserves selection and the inspector; Element controls reopens it. The labelled Move toolbar handle pins its workspace position across selections, pages and reloads. Closing it stays closed across selections until Element controls explicitly restores it. Video selections expose Play / pause video. The hero is muted and plays inline, and both enclosing editor frames explicitly allow autoplay. A browser or external video host can still reject playback; do not remove authentication or deployment protection to work around that.

The inspector groups Size & position, Layout & spacing, Text & typography, and Background, borders & shadow, with navigation shortcuts and descriptions. Controls include per-side spacing, typography, border styles, preset/custom shadows, opacity, fit and aspect ratio. Columns enables grid when display is unspecified; direction enables flex. All values pass the same bounded vocabulary in `content-core/design.cjs` for canvas, preview and publication. Desktop, tablet and phone overrides retain exclusive media ranges; shared defaults are explicitly labelled.

Native dragging uses the upper/lower edges for before/after and the centre for supported container insertion. Exact insertion lines and layer order remain the structural model. Free movement changes device-scoped offsets; it does not remove the element from normal document flow. Moving protected integrations between owners is deliberately blocked. Reordering siblings no longer writes redundant parent overrides that were rejected by validation.

## Canvas architecture

`editor/src/live-canvas.ts` reconciles the previous trusted renderer output, next trusted output and live DOM. Stable source block/element keys reuse nodes during content edits and reorders. Unchanged source branches retain their runtime DOM, including video playback and generated integrations. Newly cloned scripts are inert; editing cannot introduce executable code. Style-only changes update the validated design stylesheet synchronously. Other changes are batched briefly and patched in place. Switching pages replaces the canvas document; normal edits do not.

The last trusted HTML snapshot is independent of runtime mutations. Do not replace this with `innerHTML` comparison against live integration output. Keep staged-image resolution and the mutable, parent-controlled preview resource map when changing the renderer. Preserve canvas selection chrome and insertion lines across patches. Offsets use saved model coordinates rather than a computed animated transform; canvas transitions are disabled while authoring to prevent drift.

The wedding policy card no longer forces its appearance with overriding CSS. Its default layout has readable padding, labels and paragraph spacing. Four virtual managed paragraph descriptors provide individual appearance controls for included items, catering, alcohol and parking. Their stable IDs map to the canonical Weddings fields; they never create duplicate policy copy or modify original source offsets. Runtime annotation adds style tokens after the existing content loader creates paragraphs. Public output includes style tokens and mapping metadata, without authoring selection attributes.

## References and reuse

REA (`https://github.com/morluto/rea`) was reviewed as an analysis workflow, not imported as an editor dependency. Its skill advises ordinary repository tools where source is available. No REA MCP installation or execution is claimed. Existing OpenPage attribution remains; no code from the other editor repositories was added.

Interaction references reviewed: [Webflow style panel](https://help.webflow.com/hc/en-us/articles/33961362040723-Style-panel-overview), [Webflow effects](https://help.webflow.com/hc/en-us/articles/33961245810451-Effects), [Wix Studio inspector](https://support.wix.com/en/article/studio-editor-using-the-inspector-panel), and [WordPress moving blocks](https://wordpress.org/documentation/article/moving-blocks/). These inform grouping and interaction, not copied implementations.

## Verification and limits

`tests/studio-smooth.cjs` uses real handlers and an isolated Git adapter. It checks document/node identity across edits, video decoding/playback, return-to-origin offsets, toolbar movement/closing, native reorder, added video playback, individual wedding paragraph styling, sibling movement and private saving. `element-model.cjs` covers new typed inserts, layout activation, custom-shadow bounds, unsafe-value rejection and public managed-style rendering. Existing API, responsive, recovery, preview, all-page and atomic publication tests remain required. Run `npm run typecheck`, `npm test`, and `npm run build`.

Code deployment and staff publication are separate. Verify the GitHub Vercel commit status and deployed bundle after shipping. These isolated tests do not prove production staff credentials or shared private storage configuration. Optional Redis team backup still needs owner configuration and verification; browser recovery is not a cross-device durable backup. No claim of universal drag access to protected integrations, arbitrary code editing, or a durable release worker is introduced by this change.
