# Professional authoring workspace

October 22, 2026. Extends guide 19. This release improves the integrated Sane Living authoring workflow; it does not install the complete Webstudio or Instatic applications, their databases, plugin runtimes, identity systems or AI services.

## Side panels

Drag either vertical divider to adjust Blocks/Layers or Inspector. Pointer capture and a temporary interaction shield retain the gesture when it crosses the preview iframe. Arrow keys adjust a focused divider, Shift makes larger steps, Home/End choose bounds and double-click restores the default. Widths persist as versioned browser preferences, separate from website content and Undo. Narrow screens retain the existing single-panel navigation. Minimum widths preserve the canvas and prevent horizontal overflow. Width changes update CSS variables directly, without repeatedly rendering the React application or rebuilding the canvas document.

## Reusable sections

Select a newly created typed section, row, column or element, name it and choose Save reusable section. Insert lists the saved trees. Inserting makes an independent copy with new IDs and remapped parent/sibling references, including responsive design settings. Original source sections are deliberately excluded: duplicating their script IDs would break connected site features. Use their existing element controls or construct a typed layout for reuse.

Reusable definitions live in optional `project.patterns`, inside the existing version-2 layout. They are included in browser autosave, recovery, exports/imports, immutable snapshots, optional team-draft backup and the existing atomic publisher. Publishing stores them in `content/site-layouts.json`; they do not render until a copy is inserted into a page. Referenced staged images are promoted by the same release as the layout. Removing a definition retains copies already placed on pages. This is an independent-copy library, not linked global components.

Limits: 20 definitions, 60 blocks per definition, existing 700 KB project cap. Every reusable tree must be self-contained and use approved typed blocks; unknown properties, source references, unsafe media/styles, disconnected parents and cycles are rejected by shared core validation. Validation reuses a synthetic trusted registry/page, so reusable content receives the same prop/placement/design checks as a real page. No new storage service or unauthenticated write endpoint is introduced.

## Layout construction and design depth

Custom grid creates 1–6 rows and 1–6 columns as real Section → Row → Column nodes, with phone stacking and tablet defaults. Insertion remains one undoable operation and validates the project before applying; project limits fail visibly with the existing draft retained.

The inspector adds independent row/column gaps, grid rows, child row/column spans, wrapping, flex grow/shrink/basis, self alignment, positioning/overflow, text case/decorations, image focal position, individual corners, rotation, scale, two-colour gradients and angle. Advanced dimensions accept bounded numeric px, %, rem, em, vw, vh and svh values plus supported sizing keywords. They override basic numeric dimensions and can be cleared individually. Unit, colour and media input is buffered while incomplete. Valid values apply immediately; Enter/blur validates and reports invalid input without putting it into the saved project. Device changes and selection changes reset the buffer to the selected element’s saved value.

Normal, Hover and Keyboard focus states are separately editable for each device. The canvas can force the selected state for inspection; private preview and production use actual pointer/focus behavior. State rules use the same validated style vocabulary, excluding video-source replacement. Button surface/padding/border controls apply to the clickable anchor while retaining its wrapper spacing. Keyboard styles match a directly focused source element or a typed component containing a focus-visible element. Temporary forced-state attributes never enter published markup.

All styles use `content-core/design.cjs` in the canvas, preview, API preflight and static build. Existing fields/values remain valid. No arbitrary CSS expressions, CSS URLs or user scripts are introduced. Unset new fields do not change existing page rendering. Layout and text rules target the appropriate typed container/descendants; source elements retain their stable style hooks.

## Source integration and scope

Existing Instatic MIT insertion and wireframe reuse remains. Reviewed Webstudio’s current SplitView, grid controls and CSS value conversion architecture for this release. Its application components depend on Webstudio’s state/model/style runtime and use AGPL-3.0. No Webstudio code or license change to the existing website is introduced here. Instatic’s insertion rules continue through the existing adapter rather than replacing the publisher.

Feature parity with the complete upstream products is not an acceptance claim: linked component propagation, arbitrary user code/packages, CMS collection design, individual identities/roles, collaboration presence, externally shareable private previews, AI providers and a durable deployment/rollback worker remain separate integrations. Existing optional team backup still requires the documented host configuration; otherwise the UI accurately describes browser-private recovery.

## Verification

`tests/pro-editor.cjs` exercises actual pointer and keyboard resizing, retained canvas/video identity, persisted widths, custom grids, unit validation, gradients/transforms, real hover/keyboard-focus styling, reusable tree cloning with unique IDs, refresh recovery, immutable preview, responsive overflow and publication through real API handlers against an isolated Git adapter. Malformed reusable definitions and CSS injection attempts are rejected. Existing regression tests retain their normal save/conflict/integration coverage. No test writes to production.
