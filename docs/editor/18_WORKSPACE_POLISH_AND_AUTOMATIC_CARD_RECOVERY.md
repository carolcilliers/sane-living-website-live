# Workspace polish and automatic card recovery

October 22, 2026. Extends guide 17.

## Design brief and source

Paul requested the Impecable skills and a less crowded, better-looking staff workspace. Prior confirmed direction remains: a calm, readable Apple-like dashboard and Framer-like dark editor for nontechnical venue staff, with clear saving/publishing and a faithful website canvas. `.impeccable.md` records that context; DESIGN.md documents the workspace-specific conventions.

Reviewed [Impecable](https://github.com/ByChokeYT/Impecable/tree/d0453bffd697f6fdd08e5d5244643d6afadcc7de) skills: impeccable, polish, typeset and adapt, including typography/spatial references. No global skill bundle was installed and no cleanup script, agent delegation, third-party runtime, font dependency or editor code was imported. The upstream maintenance step for upgrading an installed skill bundle does not apply to this read-only reference use.

## Workspace changes

`public/dash/workspace.css` owns the dashboard refinement layer. Existing Nunito identity, content paths and actions remain. Home places the venue calendar beside actionable section links; counts form a quiet summary. Shared fields/buttons, Settings, Gallery, rate tables, collection headings, focus states, readable status messages and mobile targets use consistent spacing and hierarchy. Toasts no longer cover save actions at the bottom of the phone screen.

`editor/src/workspace-polish.css` defines light/dark chrome tokens, a more readable inspector, quieter layers and typed-insert cards, wider desktop controls and responsive panel treatment. The iframe retains its own website styling. The floating toolbar keeps the main drag/move/resize/remove controls; section movement and arrow controls remain in Layers/the inspector. New typed Content card, Quote, Details and Badge inserts have restrained venue styling, without changing original marketing templates.

## Existing damaged drafts now recover on open

The earlier update prevented new card extraction and added a manual repair. It did not repair the existing saved draft automatically; Paul's subsequent screenshot still showed detached captions. This release detects card parts whose saved parent differs from the original frame hierarchy, repairs that card family's layout and clearly displays **Image cards recovered**.

Recovery occurs only after ordinary draft compatibility validation. It keeps image URLs, caption edits, galleries, cosmetic colours/borders/shadows, visibility choices and unrelated page edits. The old workspace is retained in Undo, and saving the repaired draft uses the existing versioned private-storage flow, retaining the previous stored version in recovery history. Published source/conflict baselines remain unchanged; stale publication protection is not reset. Published content is never updated automatically.

`core.cardLayout.repairDetached` is pure and idempotent. When no parent is detached, it returns the existing values and does not reset valid card offsets or styling. The affected family restoration is the same bounded layout repair documented in guide 17. The recovery notice is dismissible; normal explicit publication is still required after review.

## Verification

- `workspace-polish.cjs`: all dashboard sections, working draft save, keyboard focus, editor light/dark themes, reduced motion and no horizontal overflow at 375/768/1024/1440.
- `image-card-drag.cjs`: older corrupt saved draft is repaired on load with a visible notice; Undo returns to the original, manual repair and Redo work, text/other edits persist; repeated pointer dragging, preview and isolated publication remain verified.
- `element-model.cjs`: detached detection, no mutation, idempotence and retained content/style values.
- Existing API, all-page, recovery, private team draft, responsive, media and publication regressions remain required.

Screenshots are checked in the local browser at desktop/phone sizes. Real physical-device testing and production staff credential/shared-storage verification are not implied by this automated suite. Before declaring deployment complete, check the commit's Vercel status and served editor bundle/dashboard stylesheet.
