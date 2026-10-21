# Editor workflow, interaction and redesign contract

Target experience: clean, readable controls and reliable actions. This is a functional design brief for implementation, not a visual mockup or approved frontend redesign.

## Workspace

Add Page editor before About and Settings; Settings remains last. Preserve all current dashboard sections. The editor uses a focused workspace with a page picker, Layers/Add section panel, canvas, contextual inspector and persistent save/publication status.

| Area | Required behavior |
| --- | --- |
| Top bar | Page label, route, device width, undo/redo, Preview, Save draft and Publish |
| Left panel | Page list; searchable approved sections; layer list with clear drag handles |
| Canvas | Actual page rendering plus separate selection overlays/insertion guides |
| Inspector | Content, Layout and Style controls; show local/global scope |
| Status area | Saved revision/time, unsaved changes, errors and current publication job |
| History | Separate local undo from durable releases; both clearly named |

Use labels with icons where they improve recognition. Avoid tiny low-contrast text, hidden essential actions and decorative pill navigation. Fields should have clear boundaries, visible focus and comfortable spacing. Match the dashboard's restrained style; branding changes should not be inferred from an upstream demo theme.

## Editing behavior

Clicking a section selects it without triggering its real booking/form actions. Provide explicit Preview/Visit live actions for navigation. Double-click or a labeled Edit text action may enter inline text mode if the proof demonstrates safe rich-text handling; a polished inspector field is the reliable fallback.

Drag-and-drop must show allowed drop positions, retain selection/scroll, and reject invalid nesting. Add keyboard move up/down controls and live announcements. After remove, move focus to a sensible neighboring section and offer Undo. Group a continuous typing/drag transaction into one undo step; selection/viewport changes are not content history.

The first editor rearranges sections and changes approved variants. Free pixel positioning, arbitrary CSS, custom scripts and unlimited nested rows are not v1. Where controlled columns are needed, use named component slots with explicit allowed children.

## State and button semantics

| Visible state | Meaning | Available action |
| --- | --- | --- |
| Loading | Sources/revisions not resolved | Editing/publish disabled |
| Saved locally | Device recovery exists but team save not acknowledged | Save draft; explain scope |
| Unsaved changes | Current state differs from acknowledged draft | Save draft / Preview if valid |
| Saving draft | Snapshot in flight | Continue typing; preserve newer changes |
| Draft saved | Server acknowledged exact revision | Preview / Publish after review |
| Conflict | Another writer changed source/draft | Compare/reload; export recovery; no blind overwrite |
| Session expired | Access must be renewed | Sign in; preserve local work; recheck baselines |
| Publishing/building | Reviewed snapshot accepted/in process | Monitor job; newer edits remain separate |
| Live verified | Production marker/content match | View site / release history |
| Failed/needs attention | Known stage failed or verification unknown | Retry appropriate stage; no misleading success toast |

Autosave is a convenience, not the sole indicator of safety. Show explicit Save draft. On navigation with unsaved work, preserve recovery and present an appropriate warning. Server-save acknowledgement must never mean “live.” Publish is unavailable when load failed, required fields are invalid, sources are stale or authorization is absent.

## Preview

Preview is an immutable snapshot. Show page route, selected draft revision and whether global changes are included. If the user edits afterward, label preview out of date. The publication review is tied to a snapshot hash; it cannot accidentally publish different revisions.

Use a real iframe viewport or equivalent tested isolation so breakpoints match published output. Test at 375, 768, 1024 and 1440 CSS pixels plus arbitrary widths. No credentials or staff-only content enters page output. Prevent real form/newsletter/event mutations in preview; show a clear integration placeholder or approved read-only view. Preview forms must not pretend to submit successfully.

On small screens, use panel drawers and persistent readable actions. Establish whether full design editing is practical during proof. At minimum, browsing pages, editing content, saving and previewing must have an honest supported-device story; do not silently disable all mobile editing because an upstream project did.

## Redesign interface

The frontend designer provides: approved font/color/spacing tokens, shared header/footer, hero variants, image/text layouts, gallery treatment, CTA hierarchy, event/pricing/form presentations, mobile behavior and reduced-motion expectations. Components expose semantic fields independent of DOM position.

| Redesign change | Stable element |
| --- | --- |
| Logo repositioned/resized | `settings.logoUrl`, `logoAlt` and asset workflow |
| Footer redesigned | Global nav/contact/branding sources |
| Hero restyled | Content/CTA/media fields and safe destinations |
| About layout changed | Stable section IDs and original story source |
| Pricing cards redesigned | Pricing resource values; no re-entry |
| Calendar restyled | Airtable source and Publish semantics |
| New rich-text appearance | Stored document/Markdown compatibility and semantic markup |

Do not show a generic widget catalogue that encourages staff to create duplicate booking or event systems. Each functional block should make its source clear: “Uses Events” / “Uses Settings → Booking.” Selecting a bound field opens the appropriate canonical editor or a scoped projection of the same resource.

## Accessibility and usability acceptance

Controls need accessible names and error associations; keyboard users must complete add/edit/reorder/save/preview. Focus and selection must remain predictable after renders. Status updates should be announced without interrupting typing. Respect reduced motion. Test actual zoom and long text, not only screenshot dimensions.

Usability pilot tasks: replace an image and alt text; edit an About paragraph; reorder sections; recover after refresh; save on one browser and open on another; understand a conflict; preview mobile; publish; distinguish a build failure from unsaved work; restore a previous content release. Record completion issues and revise controls before broad rollout.

