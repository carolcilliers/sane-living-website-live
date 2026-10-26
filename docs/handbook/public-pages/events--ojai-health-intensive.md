# /events/ojai-health-intensive/ — page rulebook

## Route, implementation and data

Route `/events/ojai-health-intensive/` resolves to `public/events/ojai-health-intensive.html`. Airtable public feeds plus existing archive HTML. Approved event-stories enrich existing components; dates and calendar visibility remain in Airtable.

Scripts:

- `/site-config.js`
- `/site-content.js`
- `/script.js`

## Stable hooks and sections

No explicit data-site hook in this authored file; navigation/footer still use shared settings.

Source IDs: `site-nav`, `site-footer`.

## Image placements

`/images/events-past/unnamed-5.jpg`

## Editing rules

Use the owning dashboard section for canonical content. Preserve authored wording, prices, destinations, media and inline integrations unless the task explicitly authorizes changes. Inspect the template registry and active layout before editing trusted HTML. Inactive source changes require the documented capture; active editor layouts require an explicit migration. Never create a directory-index twin. Upload unique assets, then change only the intended reference. Do not copy credentials into HTML or bypass publication filters.

## Full-stack and release checks

Read ../STACK.md and ../CONTENT_AND_OPERATIONS.md. Settings, About and SEO can be materialized during build. Test real rewrite routes, data loading/fallbacks, relevant links/media, phone/desktop rendering and the published result. Confirm no shadow directory wins routing. Follow ../RELEASE_AND_TESTING.md for expected-head main updates and deployed asset verification. Keep this source inventory current when hooks or ownership change.
