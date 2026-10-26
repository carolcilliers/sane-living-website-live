# /rent/pricing/ — page rulebook

## Route, implementation and data

Route `/rent/pricing/` resolves to `public/rent-pricing.html`. public/content/pricing.json, exact session/rate strings and existing availability settings.

Scripts:

- `/site-config.js`
- `/site-content.js`
- `/script.js`

## Stable hooks and sections

- `data-site-availability=`
- `data-site-booking=`

Source IDs: `site-nav`, `pricing-note-date`, `pricing-note-text`, `pricing-hours`, `pricing-rows`, `weddings`, `pricing-weddings-note`, `pricing-availability-note`, `site-footer`.

## Image placements

No direct img reference in this source; inspect dynamic/native content and backgrounds.

## Editing rules

Use the owning dashboard section for canonical content. Preserve authored wording, prices, destinations, media and inline integrations unless the task explicitly authorizes changes. Inspect the template registry and active layout before editing trusted HTML. Inactive source changes require the documented capture; active editor layouts require an explicit migration. Never create a directory-index twin. Upload unique assets, then change only the intended reference. Do not copy credentials into HTML or bypass publication filters.

## Full-stack and release checks

Read ../STACK.md and ../CONTENT_AND_OPERATIONS.md. Settings, About and SEO can be materialized during build. Test real rewrite routes, data loading/fallbacks, relevant links/media, phone/desktop rendering and the published result. Confirm no shadow directory wins routing. Follow ../RELEASE_AND_TESTING.md for expected-head main updates and deployed asset verification. Keep this source inventory current when hooks or ownership change.
