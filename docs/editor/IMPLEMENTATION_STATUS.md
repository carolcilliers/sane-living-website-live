# Website Studio — implementation status

October 21, 2026. The current implementation is specified in [14_WEBSITE_STUDIO_GUIDE.md](14_WEBSITE_STUDIO_GUIDE.md). It supersedes the About-only pilot and its transfer-to-form publishing workflow.

Implemented: embedded Pages/Insert/Layers/Inspector workspace with the dashboard sidebar retained; all 25 current public pages; editable original text/links/images and section order/visibility; 15 approved block types; new page creation; integrated About editing; private browser draft/recovery with revision protection; immutable full-page previews in new tabs; staged raster uploads; reviewed atomic multi-file publication directly to `main`; release markers and bounded live checks; clear grouped gallery cards.

Direct manipulation now includes nested source-element layers, click selection, native drag/drop, desktop pointer offsets and validated style controls; insertion within existing containers; original-image carousels; an aligned searchable header page dropdown; default dark theme; and in-editor Settings. Homepage hero video/poster and CTA edits use the canonical settings source and publish atomically with layouts and referenced images.

The code launch does not include a layout or alter public page bodies. The renderer activates pages only through explicit publication. Existing Settings, Gallery, About Markdown and integration ownership are retained. Removing a source section retains hidden integration markup and offers restoration. Original source sections cannot be cloned because their script IDs must remain unique.

Drafts and previews are private to this browser, not shared team cloud storage. The existing shared staff session remains; individual roles, a durable release worker, one-click restore and automatic active-template redesign migration are not implemented. The larger architecture documents remain target designs. G2 shared private authoring and G3 durable verified releases are not claimed complete.

Verification uses `npm run typecheck`, `npm test` and `npm run build`, including actual handlers against isolated Git fixtures and Playwright flows. Passing local tests is not production authentication or deployment evidence. Deployment management was denied for Vercel team `carol-cilliers` by the connected account's missing scope grant. Confirm the deployed bundle and real release marker separately before calling production ship-ready.

The OpenPage-derived sortable layer rows retain their MIT notice in `LICENSES/OpenPage.txt`. Framely informed the workspace arrangement; no Framely source was copied.
