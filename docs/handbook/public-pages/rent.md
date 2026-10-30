# /rent/ — page rulebook

## Route, implementation and data

Route `/rent/` resolves to `public/rent.html`. Authored HTML and shared site settings; inspect content/page-templates.json for Page Editor ownership.

Scripts:

- `/site-config.js`
- `/site-content.js`
- `/script.js`

## Stable hooks and sections

- `data-site-availability=`
- `data-site-booking=`
- `data-site-rental-inquiry=`

Source IDs: `site-nav`, `spaces`, `open-gallery-btn`, `occasions`, `rent-photos`, `rent-photo-grid`, `weddings`, `wedding-heading`, `wedding-hero`, `wedding-intro`, `wedding-highlights`, `wedding-details`, `wedding-photos`, `wedding-photo-grid`, `wedding-pricing-text`, `calendar`, `rent-availability-note`, `availability`, `extras`, `gallery-modal`, `gallery-close-btn`, `gallery-prev-btn`, `gallery-main-img`, `gallery-next-btn`, `site-footer`.

Design: V4 "day into night" (see DESIGN.md). Sections: opening photo, The Spaces (four spaces), Occasions (gallery tiles), Weddings (from /content/weddings.json — the old /rent/weddings/ page redirects here), Check a Date (calendar + request form), Partners & nearby stays.

## Image placements

`/images/main-hall.jpg`, `/images/center-office.jpg`, `/images/annex-placeholder.jpg` (temporary), `/images/venue-secret-garden.jpg`, `/IMG_0197.jpg` (wedding fallback)

## Editing rules

Use the owning dashboard section for canonical content. Preserve authored wording, prices, destinations, media and inline integrations unless the task explicitly authorizes changes. Inspect the template registry and active layout before editing trusted HTML. Inactive source changes require the documented capture; active editor layouts require an explicit migration. Never create a directory-index twin. Upload unique assets, then change only the intended reference. Do not copy credentials into HTML or bypass publication filters.

## Full-stack and release checks

Read ../STACK.md and ../CONTENT_AND_OPERATIONS.md. Settings, About and SEO can be materialized during build. Test real rewrite routes, data loading/fallbacks, relevant links/media, phone/desktop rendering and the published result. Confirm no shadow directory wins routing. Follow ../RELEASE_AND_TESTING.md for expected-head main updates and deployed asset verification. Keep this source inventory current when hooks or ownership change.
