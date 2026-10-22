# Canvas tools and grid recovery

## Interaction contract

The canvas uses the upstream **Moveable 0.53.0** package for drag geometry, eight-direction resize handles, snapping, gap measurements and edge/centre guidelines. `CanvasTransform.ts` adapts completed gestures to the existing validated page model. Native structural reordering retains the existing Instatic insertion-tree adapter and source/card ownership safeguards. This is a focused integration, not a merge of the full Webstudio application.

- **Select / Done / Escape:** exit the current mode. Escape cancels an unfinished gesture without changing the draft.
- **Move freely:** toggle local placement on the selected target. Bounds keep movement in the containing layout. Select a different element to exit the mode. Use Reorder for structural movement and retained layout spacing.
- **Reorder:** a selectable mode, mutually exclusive with Move and Resize. Drag the actual element onto a highlighted boundary, or drag the toolbar reorder handle directly. Image-card frames and captions retain their shared ownership. Up/down changes sibling order; at an edge, feedback explains the boundary.
- **Resize:** toggle eight edge/corner handles. Drag a handle or edge, rather than the centre of the element. Width and height commit together with the offset needed to anchor the opposite edge. Flex items retain their requested width. Resizing a typed grid column reallocates width with its neighbour, preserving the row width and gutter; row tracks and column geometry commit in one history operation.
- **Align:** left/centre/right and top/middle/bottom align the selected movement unit within its parent. Completing an alignment exits the active mode.
- **Snap:** toggle Moveable's edge, centre and equal-gap snapping. The control retains its state when the selection changes.
- **Reset position:** clears the selected movement unit's offsets on the current device. Structural order is retained; Undo reverts a structural reorder.
- **Reset size:** removes current-device geometry overrides. For a grid column, it also restores the row's preset track sizing.
- **Settings / Insert / Remove / Video:** keep their existing site-specific pathways. Settings focuses the selected inspector; Insert retains an exact insertion target; removal keeps source visibility and component-part semantics; video controls the selected section's player.

Toolbar placement and dismissal remain separate workspace preferences. The labelled drag heading and close button share a header row. Transient Moveable nodes and injected styles survive same-page reconciliation; the engine is destroyed when the iframe unloads. Pointer movement does not write React history on every event. One completed gesture produces one device-scoped history edit, followed by the existing private autosave and preview/publish flow.

## Fractional-offset recovery

The previous hand-written snapping path could store fractional `x`/`y` values even though the schema requires integers. That caused otherwise-valid grid insertion to fail with **Invalid x design value** because insertion validates the whole candidate project.

`content-core/geometry.cjs` narrowly rounds finite fractional offsets already within the allowed range. Recovery runs on a cloned saved workspace before validation. The original saved record is retained until the normal versioned autosave succeeds. No text, images, IDs, order or source-revision baseline is replaced. Unknown settings, unsafe values and out-of-range coordinates still fail validation. New gestures round and validate before modifying the project.

Grid track values use a bounded `gridTracks` grammar of one to six positive `fr` values, each no larger than 10000. Shared rendering emits them on the row's content container inside the selected device's media query. Changing layout presets/proportions clears custom track sizing. No raw CSS is accepted.

## Verification

- `tests/geometry-contract.cjs`: narrow/idempotent offset recovery; unsafe values remain rejected; safe responsive grid-track rendering.
- `tests/canvas-tool-paths.cjs`: actual pointer movement, every resize handle, repeated movement back to the same position, mutually exclusive tools, selection exit, alignment, snap, reset, custom grid insertion, neighbour track resizing and recovery from a saved fractional-offset draft.
- `tests/toolbar-interaction.cjs`: button clicks, inspector focus, mode toggle/Done/Escape, persistent toolbar position and dismissal.
- Existing insertion, source-card, component, media, private-save, immutable-preview, stale-revision and fixture-publication suites remain required.

Tests use isolated API fixtures and never publish test designs to production. Production entry HTML and emitted bundles must match the tested release before reporting the deployment as live.
