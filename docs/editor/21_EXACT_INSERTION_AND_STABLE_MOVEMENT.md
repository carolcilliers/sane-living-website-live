# Exact insertion and stable movement

October 22, 2026. Regression repair extending guide 20. This is an improvement to the existing editor, not a claim of complete Webstudio/Instatic feature parity.

## Position is explicit

Clicking an Insert here line opens the full Insert library, clears its previous search and displays the actual before/after section target. The pending target is cleared when selecting a different element or switching pages. An explicit line wins over the previously selected layer. Empty typed containers open Insert directly. The selected typed container also exposes insertion lines between its children. Dropping in the surrounding editor chrome does not silently insert at a stale selection.

Canvas drag and drop use the same nearest annotated element and edge geometry. Top/bottom edges mean before/after; the middle of a supported container means inside. Original sections remain whole, and trusted source-container IDs continue to be validated. The editor does not detach arbitrary generated source content across original sections.

## One ordering operation

`editor/src/block-placement.ts` handles subtree membership, visual sibling order, normalisation and relocation. Moving a layout moves its complete tree. Sibling arrows skip descendants and stop at the first/last sibling. Layer drag can move a typed tree beside a layer in another container, subject to the existing validation and cycle checks. Explicit typed sibling anchors are materialised before movement, then normalised into array order; trusted original DOM anchors remain intact. Invalid moves retain the draft and display the reason.

The live DOM reconciler reuses existing keyed descendants when adding a wrapper. Deep-cloning a new wrapper around an existing block could duplicate that block. Selection keeps at most one floating toolbar. Its measured height and insertion-line bounds determine automatic placement so a wrapped toolbar cannot intercept a section insertion button. Newly added annotated elements receive drag affordances after patching. Same-page edits continue without replacing the iframe or interrupting retained media.

## Element controls and images

The floating toolbar identifies image, layout, button, text and video settings and opens the existing inspector. It includes Insert and working sibling arrows. Detailed settings still live in the inspector, preserving the established shared validation and publish path.

New image display presets use the existing responsive design fields: Natural size, Fill/crop, Small card, Full screen, Background and Parallax. They apply to the selected device only; content and layer order remain shared. Image dimensions target the visible image and remove the inherited inner container width cap when sizing is explicitly set. Background modes retain the image source, render it as the layer's background and hide the foreground copy only in that device's media query. Selecting the parent remains necessary to change the entire parent section. Fixed backgrounds follow existing device/reduced-motion browser behavior.

Upload labels now use theme surfaces and readable theme text rather than a white background with pale text.

## Free movement

Click Move freely or Resize to select a persistent tool, then drag the element itself. Select or Escape returns to normal selection. Clicking a tool without moving does not write a draft change; dragging from the old toolbar handle remains supported. Pointer resizing clears conflicting advanced width/height presets in the current device scope.

During Move freely, transient pointer-free overlays show the page edges/centre and parent bounds. Edge/centre snapping considers the parent and visible siblings, with a six-pixel threshold. Alt bypasses snapping. Guides are removed on pointer completion/cancellation and never enter saved layouts or published markup. The final offsets use the existing device-scoped design settings; pointer updates do not rerender React or reload the canvas.

## Loading and persistence

Mutable dashboard/editor entry documents and dashboard JavaScript use no-store cache headers. Hashed Vite assets retain their normal caching behavior. Page switches reset insert search/target but do not reset the draft. No publishing or draft conflict guards were removed; code updates do not publish test layouts or change staff content.

## Verification

`tests/insertion-regression.cjs` uses the real dashboard, iframe event handlers, IndexedDB recovery and full-page preview against the isolated API test adapter. It checks real boundary clicks, repeated whole-tree drag payloads, arrows, original-container crossings, unique rendered IDs/toolbars, themed upload controls, image modes, pointer guides, device isolation, page-switch library consistency and save/reload. Existing editor, content API, conflict, image/card and publish tests remain required. Production staff designs are not written by tests.

## October 26 verification: stable row width during column resize

A fractional-track change inside an intrinsically sized flex context could grow the entire row, rather than reduce its neighbor. CanvasTransform now captures the row's measured width at gesture start (rounded to the shared CSS whitelist's three decimal places) and sends it with the existing track update. The device-scoped geometry writer validates and stores that width with a 100% maximum, along with the redistributed tracks. Existing layouts need no migration; no data or public design changes until a user deliberately edits/publishes a layout. Undo and current-device overrides are retained. Resizing columns establishes a width for the row at that breakpoint; selecting the row and using Reset size restores its fluid sizing while leaving the track proportions available.

The browser regression verifies horizontal resizing on both sides, all eight handles, exclusive tool modes, valid unsnapped inverse motion, alignment, grid creation, redistribution with an unchanged total width, and fractional-offset draft recovery. Current-source card tests cover nested `.rent-card-photo` frames and real source heading fields; they do not force the marketing page back into its old markup. Toolbar persistence is measured within its canvas coordinate system, allowing intentional scrolling of the surrounding dashboard.
