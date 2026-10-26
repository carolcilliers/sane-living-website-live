# / — page rulebook

## Route, implementation and data

Route `/` resolves to `public/index.html`. Authored HTML and shared site settings; inspect content/page-templates.json for Page Editor ownership.

Scripts:

- `/site-config.js`
- `/site-content.js`
- `/script.js`

## Stable hooks and sections

- `data-site-availability=`
- `data-site-email=`
- `data-site-hero-video=`
- `data-site-href=directionsUrl`
- `data-site-href=homePrimaryUrl`
- `data-site-href=phoneLink`
- `data-site-map=`
- `data-site-text=address`
- `data-site-text=homeHeading`
- `data-site-text=homeIntro`
- `data-site-text=homePrimaryLabel`
- `data-site-text=hours`
- `data-site-text=phoneDisplay`

Source IDs: `site-nav`, `eventsSection`, `eventsGrid`, `rent-the-space`, `availability`, `home-availability-note`, `find-us`, `site-footer`.

## Image placements

`/images/main-hall.jpg`, `/IMG_0197.jpg`, `/images/center-office.jpg`

## Editing rules

Use the owning dashboard section for canonical content. Preserve authored wording, prices, destinations, media and inline integrations unless the task explicitly authorizes changes. Inspect the template registry and active layout before editing trusted HTML. Inactive source changes require the documented capture; active editor layouts require an explicit migration. Never create a directory-index twin. Upload unique assets, then change only the intended reference. Do not copy credentials into HTML or bypass publication filters.

## Full-stack and release checks

Read ../STACK.md and ../CONTENT_AND_OPERATIONS.md. Settings, About and SEO can be materialized during build. Test real rewrite routes, data loading/fallbacks, relevant links/media, phone/desktop rendering and the published result. Confirm no shadow directory wins routing. Follow ../RELEASE_AND_TESTING.md for expected-head main updates and deployed asset verification. Keep this source inventory current when hooks or ownership change.
