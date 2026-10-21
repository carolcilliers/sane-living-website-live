# Page, component and binding contract

Status: proposed v1. [JSON Schema](schemas/page-document.schema.json) defines structural validation. This document adds semantic rules the schema cannot establish. The [example](examples/about-layout.example.json) is synthetic; it is not a migration of live content.

## Page document

| Field | Required meaning |
| --- | --- |
| `schemaVersion` | Integer 1; unsupported future versions fail closed |
| `id` | Stable UUID created by server, independent of title/route |
| `route` | Canonical root-relative route; server must match registered page ID |
| `title` | Human page label; not automatically a second SEO writer |
| `templateVersion` | Versioned approved template identifier |
| `nodes` | Ordered outer sections with stable IDs |
| `metadata` | Optional page-local title/description/share image overrides; gateway maps to canonical `settings.pageMeta[route]` during adapter phase |

Workflow status, permissions, revision counters, actor IDs and secrets are not editable fields. Store them in private records. Do not persist selected block, viewport, undo stack, upload credentials or upstream OpenPage project settings into published page documents.

Each node has `id`, `type`, `componentVersion`, `variant`, `props`, optional `bindings`, optional `layout`, and optional named `slots`. The structural schema uses bounded strings/arrays and rejects unknown envelope fields. A component-specific validator must reject invalid properties, variants and slots. Do not mistake generic `props` acceptance by the envelope schema for complete validation.

V1 permits top-level sections plus explicitly allowed child slots. Set semantic limits at 100 total nodes, nesting depth 4, and 256 KiB UTF-8 per document as initial targets; validate total counts server-side. Tune these limits based on the proof rather than increasing them silently.

## Canonical ownership and bindings

A binding maps a component property to `{ resource, key }`. Resources are registered identifiers such as `settings`, `about`, `gallery`, `pricing`, `partners`, `weddings`; they are never arbitrary URLs or paths. Keys use an allowlisted dotted field vocabulary; reject `__proto__`, `constructor`, `prototype`, array-index assumptions and unknown fields. The gateway owns resolution and write permissions.

| Property example | Canonical source | Write behavior |
| --- | --- | --- |
| Site logo | `settings.logoUrl` and `logoAlt` | Global edit; select Settings draft revision explicitly |
| Hero headline | `settings.homeHeading` on current Home | Same value in Settings and visual view; no literal duplicate |
| Booking CTA | `settings.bookingPageUrl` | Validated site/global destination |
| About story | Stable section ID in `about` adapter | Preserve other metadata, Markdown suffix and hidden sections |
| Gallery items | `gallery` collection binding | Preserve photo IDs/flags; no implicit publish-all |
| Event records | `events:published` read source | Read-only presentation binding; change records in Events |

Bound properties must not also appear as editable literals in `props`. A resolver supplies their value; absence is an explicit validation issue or documented optional empty state. To detach a binding requires an explicit permitted operation and migration, not editing an internal JSON drawer.

Page-local SEO overrides remain in `settings.pageMeta` during initial compatibility; `metadata` is an editor projection. Later migration may move that ownership only when both writers and build readers change in one compatible release. Record this map so implementations do not create two sources accidentally.

## About adapter v1

The current sections have no guaranteed IDs. A developer-controlled migration must add stable IDs once, preserving headings, body strings, images, links, visibility, unknown fields and the Markdown suffix. Never generate IDs on every load or derive them from mutable headings/array indexes. Retain the original source and a mapping manifest for rollback.

The adapter exposes title, ordered section IDs, each section's content fields and additional Markdown. The layout references the About resource as a whole or per-section IDs. The first pilot uses one `sane.aboutSections` node with a layout variant. Sections are reordered inside the adapter-owned ordered list. A later explicit migration can allow individual structural nodes; it must atomically retire the old ordering writer.

The current philosophy template is developer-managed content attached by renderer semantics, not a heading-text substring match. Establish a stable attachment key during the migration; never cause it to disappear when someone changes “Founder” in a heading.

## First component registry

| Type | Key editable properties | Bound/external source | Constraints |
| --- | --- | --- | --- |
| `sane.hero` | Text, poster/media, CTA labels, alignment | Current Home fields where applicable | One semantic page H1; real link destinations; autoplay policy preserved |
| `sane.richText` | Restricted rich document | Optional content adapter | No raw HTML/scripts; safe marks/links |
| `sane.imageText` | Heading, body, image, alt, alignment | Optional collection field | Image aspect/focal point and text order validated |
| `sane.aboutSections` | Adapter-projected sections; approved layout | About source | Preserves hidden sections, suffix, philosophy |
| `sane.gallery` | Layout/category/limit | Gallery collection | Respect each photo's draft state |
| `sane.pricing` | Layout/heading options | Pricing resource | No copied prices; no invented numerical conversions |
| `sane.partners` | Layout/filter | Partners resource | Existing publication consent workflow preserved |
| `sane.events` | Layout, upcoming/past, count | Public API | No record writes; empty/error states distinct |
| `sane.inquiry` | Form type, heading, spacing | Approved Settings embed URL | Real provider frame; preview inert |
| `sane.availability` | Heading/height within bounds | Approved Settings URL | Does not change calendar API data/base |
| `sane.newsletter` | Approved presentation | Mailchimp settings | Real submit action and honeypot/provider fields retained |
| `sane.cta` | Label, safe destination, alignment | Optional Settings binding | Button is link when navigating; blank link blocks required CTA |
| `sane.faq` | Questions/answers | Local props | Keyboard/expanded state semantic markup |
| `sane.video` | Poster/caption/provider URL | Local immutable asset or approved host | No arbitrary iframe HTML; reduced-motion fallback |
| `sane.spacer` | Token size | None | Bounded responsive tokens |

Shared header/footer belong to the page template and global settings, not freely deletable per-page blocks. The component registry—not upstream OpenPage defaults—is the authority for allowed content.

## Registry descriptor requirements

Every component version includes a runtime schema, allowed variants, default props, inspector field definitions, allowed bindings, read/write resource scopes, allowed slots, render function, optional runtime interaction module, accessibility expectations, example fixture and migration/restore tests. A declared resource scope must match what the component actually reads.

The same pure component renderer must serve preview and static output. Resolve assets/settings/content from a frozen snapshot before render. Escape text and validate values in their output context; safe JSON does not imply safe CSS, URL or HTML. Known render errors block release rather than exporting a placeholder.

## Text strategy

New rich-text blocks should use a small document tree: paragraphs, approved heading levels, ordered/unordered lists, emphasis, strong and links; avoid arbitrary HTML. Choose a maintained, license-reviewed rich-text UI only after proof; no specific external editor is approved here.

About is currently Markdown. The proof must establish a lossless supported-format mapping or retain a Markdown-backed control with polished formatting/preview. Unsupported syntax/unknown sections must remain untouched and visible as a compatibility notice. Do not silently convert Markdown to simplified text or delete unknown markup. Acceptance requires an edit unrelated to the suffix to preserve its original content.

## Responsive design

Use semantic tokens for section spacing, width, alignment and column variant. Inherit desktop/base values unless a tablet/mobile override is explicitly present. Avoid arbitrary absolute coordinates, unbounded CSS strings and separate mobile content copies. Hiding decorative media is permissible; hiding required forms or primary content needs a clear warning and test.

## Schema/version evolution

Support published N and the planned transition version while migrating; unsupported future drafts open read-only with recovery/export. Migrations are deterministic and preserve unknown content in adapters; each has input/output fixtures and a reverse restoration strategy. UI state migrations are separate from content schema migrations.

Pin upstream and component versions. A visual redesign normally changes tokens/variants, not stable content IDs. A structural change adds a component version and explicit migration. Never bulk-convert every page merely because a new bundle was deployed.

