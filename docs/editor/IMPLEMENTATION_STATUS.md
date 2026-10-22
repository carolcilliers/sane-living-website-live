# Website Studio — implementation status

October 22, 2026. The current implementation is specified in [14_WEBSITE_STUDIO_GUIDE.md](14_WEBSITE_STUDIO_GUIDE.md). It supersedes the About-only pilot and its transfer-to-form publishing workflow.

Implemented: embedded header page selector with Insert/Layers/Inspector workspace with the dashboard sidebar retained; all 25 current public pages; editable original text/links/images and section order/visibility; 24 approved block types; new page creation; integrated About editing; private browser draft/recovery with revision protection; immutable full-page previews in new tabs; staged raster uploads; reviewed atomic multi-file publication directly to `main`; release markers and bounded live checks; clear grouped gallery cards.

Direct manipulation now includes nested source-element layers, click selection, native drag/drop, device-scoped pointer offsets/resizing and deeper validated style controls; insertion within existing containers; original-image carousels; an aligned searchable header page dropdown; default dark theme; and in-editor Settings. Homepage hero video/poster and CTA edits use the canonical settings source and publish atomically with layouts and referenced images.

The code launch does not include a layout or alter public page bodies. The renderer activates pages only through explicit publication. Existing Settings, Gallery, About Markdown and integration ownership are retained. Removing a source section retains hidden integration markup and offers restoration. Original source sections cannot be cloned because their script IDs must remain unique.

Drafts and previews default to private browser storage. An optional authenticated Redis REST adapter now supports shared private team drafts, revision conflicts and ten previous versions; it is not active until the hosting owner configures and verifies its server-only credentials. Preview snapshots remain browser-only. The existing shared staff session remains; individual roles, a durable release worker, one-click restore and automatic active-template redesign migration are not implemented. The larger architecture documents remain target designs. G2 shared private authoring and G3 durable verified releases are not claimed complete.

Verification uses `npm run typecheck`, `npm test` and `npm run build`, including actual handlers against isolated Git fixtures and Playwright flows. Passing local tests is not production authentication or deployment evidence. Deployment management was denied for Vercel team `carol-cilliers` by the connected account's missing scope grant. Confirm the deployed bundle and real release marker separately before calling production ship-ready.

The OpenPage-derived sortable layer rows retain their MIT notice in `LICENSES/OpenPage.txt`. Framely informed the workspace arrangement; no Framely source was copied.

The current extension is [15_ELEMENT_EDITING_AND_DRAFT_RECOVERY.md](15_ELEMENT_EDITING_AND_DRAFT_RECOVERY.md): exclusive desktop/tablet/phone styling, exact section lines, row/column nesting, popup-blocked preview fallback, ten local recovery versions and optional private team backup. G2 remains incomplete pending real private-storage configuration/verification; G3 remains incomplete pending durable deployment work.

Current interaction extension: [16_SMOOTH_CANVAS_AND_EDITOR_CONTROLS.md](16_SMOOTH_CANVAS_AND_EDITOR_CONTROLS.md). Same-page edits reconcile the live document rather than reloading it, retaining media playback. Floating controls are movable/closable; the inspector includes grouped spacing, typography, border and custom-shadow controls. Managed wedding policy paragraphs are individually styleable, with text owned by the Weddings content fields.

Image interaction repair: [17_IMAGE_CARD_MOVEMENT_AND_REMOVAL.md](17_IMAGE_CARD_MOVEMENT_AND_REMOVAL.md). Framed rental images/captions move together; repair is explicit and preserves content. Image-only removal and toolbar reopening are directly accessible.

Latest workspace refinement: [18_WORKSPACE_POLISH_AND_AUTOMATIC_CARD_RECOVERY.md](18_WORKSPACE_POLISH_AND_AUTOMATIC_CARD_RECOVERY.md). Applies Impecable design guidance to dashboard/editor chrome and visibly recovers detached image-card hierarchies in older compatible drafts, retaining Undo/recovery and publication safeguards.

Layout extension: [19_LAYOUT_LIBRARY_AND_BACKGROUND_MEDIA.md](19_LAYOUT_LIBRARY_AND_BACKGROUND_MEDIA.md). Adds structured sections and eight nested layout presets, selection-aware insertion using adapted Instatic MIT code, parent/section controls, and device-scoped image/video backgrounds. Full Webstudio/Instatic application parity is not claimed; their backends are not installed.

Professional authoring extension: [20_PROFESSIONAL_AUTHORING_AND_RESIZABLE_PANELS.md](20_PROFESSIONAL_AUTHORING_AND_RESIZABLE_PANELS.md). Persistent draggable/keyboard side-panel resizing; custom grids; reusable typed sections saved through the existing draft/publish model; advanced validated CSS dimensions, positioning, grid/flex placement, gradients, transforms, per-corner controls, and device-scoped hover/keyboard-focus states with live inspection. Complete upstream platform parity remains outside this installed profile.

Exact-position regression repairs, complete-subtree movement, sibling-aware arrows, transient movement guides, device-scoped image display presets and themed upload contrast are documented in [21_EXACT_INSERTION_AND_STABLE_MOVEMENT.md](21_EXACT_INSERTION_AND_STABLE_MOVEMENT.md). This does not change the upstream feature-parity limitations above.
