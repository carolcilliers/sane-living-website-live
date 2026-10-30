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
- `data-site-text=hours`
- `data-site-text=phoneDisplay`

Source IDs: `site-nav`, `top`, `eventsSection`, `eventsGrid`, `story`, `why-here`, `any-hour`, `rent-the-space` (now "Ways to book"), `availability`, `home-availability-note`, `find-us`, `late`, `site-footer`.

Design: V4 "day into night" (see DESIGN.md).


## Image placements

`/hero-video.mp4` (day half of hero), `/images/venue-patio-dusk.jpg` (night half), `/images/main-hall-08.jpg`, `/images/main-hall-02.jpg`, `/images/main-hall-05.jpg`, `/images/main-hall-12.jpg`, `/IMG_0207.jpg`, `/images/venue-purple-doors.jpg`

## Editing rules

Use the owning dashboard section for canonical content. Preserve authored wording, prices, destinations, media and inline integrations unless the task explicitly authorizes changes. Inspect the template registry and active layout before editing trusted HTML. Inactive source changes require the documented capture; active editor layouts require an explicit migration. Never create a directory-index twin. Upload unique assets, then change only the intended reference. Do not copy credentials into HTML or bypass publication filters.

## Full-stack and release checks

Read ../STACK.md and ../CONTENT_AND_OPERATIONS.md. Settings, About and SEO can be materialized during build. Test real rewrite routes, data loading/fallbacks, relevant links/media, phone/desktop rendering and the published result. Confirm no shadow directory wins routing. Follow ../RELEASE_AND_TESTING.md for expected-head main updates and deployed asset verification. Keep this source inventory current when hooks or ownership change.
