# Image movement, repair and removal

October 22, 2026. Extends guides 15 and 16 without changing stored layout versions, source-template hashes or existing field IDs.

## What staff members do

The homepage rental photos are three framed cards. Dragging an image or its caption now reorders the whole card within its row. A vertical line shows left/right placement on desktop; a horizontal line shows before/after placement when the grid stacks. Captions and images remain separately selectable for content and appearance edits. Native drag, layer movement and arrow controls share the same card ownership rule. Dropping a card outside that row is declined with a useful explanation rather than extracting an overlay or image.

Free movement and resizing from an image's floating controls apply to its frame. Temporary pointer styles are removed when the gesture ends or is cancelled; validated model styles own the final result. The floating controls do not intercept another drop while dragging.

For a draft already damaged by the older interaction, use **Restore image cards** above the canvas, or **Restore image card layout** in its inspector. This restores the original hierarchy, row order and layout properties for those card parts across screen sizes. It keeps image choices, caption text, galleries, cosmetic colours/borders/shadows, visibility choices and unrelated page edits. Undo/Redo work. Save draft or the existing autosave retains the repair; publishing remains a separate reviewed action. Guide 18 adds automatic, visible recovery of detached parents when a compatible saved draft is opened, retaining the original through Undo and versioned storage. It still never publishes a repair on staff members’ behalf.

Clicking an image selects it and updates the inspector. A closed floating toolbar stays closed; Element controls explicitly restores it. **Remove image** is visible near the top of the inspector and in the floating controls. For an added Image block it removes that image element and keeps the parent row/source section. For an Image + text or Content card block it removes only the image and keeps its text, buttons and block. For an original source image it uses the existing restorable visibility override and preserves its frame and caption. Undo restores these actions. Images remain in the asset library; removing an element is not asset deletion.

## Developer contract

`content-core/site.cjs` adds descriptor-only `dragOwner` metadata to the existing `.rent-card` hierarchy. Canvas authoring annotations carry that ID even for parts moved out of their parent by an older draft. `content-core/card-layout.cjs` resolves owners and performs immutable layout restoration; it does not mutate Undo history. Existing text/image fields retain their IDs, and newly editable card captions append stable `card-caption-<element ID>` fields. Do not insert new numbered fields ahead of existing saved field references.

Both canvas hit testing and model reordering normalize a card's parts to its root. The model declines cross-row extraction. Image parts on typed blocks use authoring-only `data-studio-part="image"`; these are UI selection identifiers, not arbitrary persistent element overrides. Empty image URLs in composite blocks omit the image and collapse the split to one column.

The live DOM reconciler resolves each insertion anchor **after** recursively morphing a child. Reparenting a descendant can move the previous anchor into another container; retaining that stale node reference caused an `insertBefore` exception and a partially updated canvas. Computing the anchor from the already placed prefix fixes repair, reverse movement and Undo without reloading the document or disturbing unrelated media state.

Existing draft/revision checks and atomic publication handlers are retained. There is no migration that discards older drafts, no authentication change and no new dependency.

## Regression coverage

- `element-model.cjs`: original field IDs, caption IDs, immutable restoration, preserved gallery/appearance/unrelated overrides and all-page body structure.
- `image-card-drag.cjs`: actual pointer movement repeatedly in both horizontal directions; caption dragging; frame boundaries; temporary-style cleanup; a deliberately damaged saved draft; preserved content; Undo/Redo; refresh; immutable preview; publication through actual API handlers and isolated Git storage.
- `image-removal.cjs`: image insertion and movement into a source container; toolbar reopen; image-only removal from nested/composite layouts; parent/text preservation; Undo and refresh recovery.
- Existing smooth-canvas, responsive, recovery, team-draft and atomic publisher regressions remain in `npm test`.

Production release evidence is the GitHub deployment status plus the served editor bundle. Isolated tests do not imply production staff credential or private team-storage verification.
