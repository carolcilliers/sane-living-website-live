# Dashboard organization and progressive disclosure

This dashboard-only pass follows Paul's Visual Product Polish playbook, particularly clarity before decoration, real app state, progressive detail, stable controls, responsive layouts and rendered verification. Upstream reference provenance remains in PRESENTATION_POLISH_2026-10-25.md. No animation engine, movie, generated asset or external editor runtime is installed.

## Scope

The native dashboard presents existing content differently. Canonical website content, public page designs, API authentication, SHA conflict checks, draft/publication semantics, Airtable integration and the Page Editor canvas remain intact. Dashboard instructions are deliberately rewritten in plain language where this improves understanding. Existing authored website values and schema keys remain unchanged.

## Home is an overview, not a second editing interface

- Real counts: upcoming events, photos in the loaded gallery, and content sections with unpublished drafts.
- **Needs your attention:** actual load/conflict/save errors, unsaved or shared content drafts, explicitly unpublished photos, event drafts and unfinished event recovery. Calendar setup, read-only and failed-load states are distinguished; an unavailable feed is not called an empty calendar.
- **Published details:** business/contact/location/hours from published Settings, separate from the staff member's working draft. A read-only published snapshot can advance after an external commit while the conflicting local draft and its original SHA baseline stay protected.
- The month calendar is always visible at the start of the overview, alongside upcoming events and operational information. Only the per-section content status list is expandable.
- Contextual actions open the appropriate existing page/category. Home contains no cloned save/publish controls, contact editor or upload flow. Page Editor design drafts are explicitly managed in Page Editor; Home does not invent a combined design-draft count, analytics, uptime, team identities or deployment-health claims.

The overview recomputes on return to Home, event load completion (including failure), and applicable external-source updates. Replacing Home never replaces the editor iframe or an editing form.

## A gallery that grows without exposing every field

Each existing website collection is a native disclosure with its exact photo count and optional unpublished count. Collection navigation opens the requested collection. The original section/location guidance remains inside it.

- Search caption, description, file path or existing gallery-group label, case-insensitively.
- Filter all photos, explicitly not-published photos, included photos, or photos missing descriptions. “In gallery” describes the working gallery; the adjacent guidance keeps Save draft and Publish meanings explicit.
- Render **12 photos per collection page**, at most 36 photo cards across the three existing collections. Previous/Next and exact result/page counts remain available. Filtering and page selection never slice, mutate or save the underlying photo array.
- Cards show the real image, caption/fallback label and status. **Edit photo details** reveals caption, description, section/group, ordering and an explicitly labelled **Remove photo** action.
- A WeakMap gives in-memory object identities to duplicate image URLs. These identifiers and open/filter/page preferences never enter saved JSON. Data writes still use each photo's original global array index, including filtered results and later pages.
- Reordering finds the preceding/following photo in the same collection, preserving other collections' positions. Ordering controls are disabled with an explanation while search/status filters hide neighbours. Moving a photo or changing its collection reveals it in its resulting page. Uploads and URL additions likewise reveal their new unpublished photos and fields.
- Search and paging replace only the collection results. The search field retains focus; existing handlers are rebound idempotently. Native disclosure state persists during in-session rerenders. All existing field events, device recovery, shared drafts, per-photo publication and delete confirmation remain real.

A page refresh resets view preferences, while content recovery continues through the existing local/shared draft system. No file is deleted by filtering, paging, closing details or removing a gallery entry.

## Contextual settings and long forms

Each Settings category has a plain-language purpose and small named groups. The primary group starts open. A **Show all fields / Collapse fields** control supplements individual native disclosures. Groups retain the original field keys and values; any future schema fields outside the known grouping render in **Additional settings** rather than being dropped. Individual page metadata overrides remain available in Search & sharing.

Examples: Branding separates logo/name, browser icon and footer note; Contact separates phone/email, location/hours, social links and maps/forms; Homepage separates hero message, main button and media. Category keyboard navigation and existing controls remain intact.

Weddings, Pricing and Partners receive descriptions of where each section appears and what its fields affect. Text and colour distinguish context, editable content, unpublished work and primary actions. There are no new automatic publishing triggers.

## Verification and release

`tests/dashboard-organization.cjs` exercises a gallery with over 100 added records (including duplicate URLs): bounded rendering, searching/filtering, pagination, retained expanded editors, correct underlying edits, same-collection reordering, whole-document equality after targeted changes, shared save isolation, reload recovery, published-vs-draft Home details, an external Settings update without overwriting a local draft, and failed/read-only calendars. Only explicit fixture actions write; browsing is read-only.

`tests/dashboard-presentation.cjs` checks all native pages and Settings categories at 320/390/768/1024/1440/1920px, 200% text sizing, actual bounds, focus and keyboard access, compact save actions, editor host/login, optional axe checks and reduced motion. It opens disclosures when testing their fields. Source-sync and Settings integration tests now follow the same user-visible opening/search paths; their safety assertions are retained.

Run `npm run build:editor`, then `npm run test:dashboard` with an available Chromium (CHROMIUM_EXECUTABLE_PATH). Set AXE_CORE_PATH to an axe.min.js file and DASHBOARD_QA_DIR for optional local accessibility checks/screenshots. Existing studio-flow, studio-settings, source-sync, content-api, typecheck and production build checks remain part of release evidence.

Inspect the latest main and preserve concurrent writers. Publish a reviewed batch through an expected-head non-force update. Check deployment status and compare live, versioned dashboard HTML/CSS/JS with the tested files. Do not commit fixture content, generated website output or QA screenshots.
