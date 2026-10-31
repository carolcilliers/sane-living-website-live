# /events/ — page rulebook

## Route, implementation and data

Route `/events/` resolves to `public/events.html`. Airtable public feeds plus existing archive HTML. Approved event-stories enrich existing components; dates and calendar visibility remain in Airtable.

Scripts:

- `/site-config.js`
- `/site-content.js`
- `/script.js`

## Stable hooks and sections

No explicit data-site hook in this authored file; navigation/footer still use shared settings.

Source IDs: `site-nav`, `upcoming` (now first, "Upcoming Community Events"), `updates` (email signup band), `recent`, `recentGrid`, `recentMoreWrap`, `recentMore`, `upcoming`, `fliersViewBtn`, `listViewBtn`, `gridViewBtn`, `prevBtn`, `monthLabel`, `nextBtn`, `calFliers`, `calList`, `gridWrap`, `calGrid`, `modalOverlay`, `modal`, `modalTitle`, `modalClose`, `modalBody`, `flyerViewer`, `flyerClose`, `flyerImg`, `site-footer`.

Design: V4 "day into night" (see DESIGN.md). Order: opening photo (main-hall-01), Upcoming Community Events + calendar, Get Event Updates, Recent Events + Ojai Health Intensive.

## Image placements

`/images/events-past/Amma-2026-Ojai-Flyer-web-2.jpg`, `/images/events-past/Leland-1-31-26.jpg`, `/images/events-past/Kalbeliya-1-30-26.jpg`, `/images/events-past/Chamber-1-28-26.jpg`, `/images/events-past/WORLD-WITHOUT-COWS.jpg`, `/images/events-past/Tahi-1000082920.jpg`, `/images/events-past/CLOWN-WORKSHOP-NEW-FLYER.jpg`, `/images/events-past/Paranadyn.jpg`, `/images/events-past/St-Nam-Rasayan_2025.jpg`, `/images/events-past/Kirtin-PosterRev1-scaled.jpg`, `/images/events-past/Ojai-Community-event.jpg`, `/images/events-past/Grof-Breathwork-flyer.jpg`, `/images/events-past/Donna-August-2025.jpg`, `/images/events-past/Living-Promise.jpg`, `/images/events-past/SOUL-MOTION.png`, `/images/events-past/IMG_5354.jpeg`, `/images/events-past/Valentine-donation.jpg`, `/images/events-past/FLOW-FINAL.jpg`, `/images/events-past/Coexist-9-11.jpg`, `/images/events-past/CABRINI.jpg`, `/images/events-past/REMATRIATION.jpeg`, `/images/events-past/Joss-Jaffe.jpeg`, `/images/events-past/Constellation-June-15-2024.png`, `/images/events-past/Archtypes-of-Mary-Magdalene.jpg`, `/images/events-past/Rug-Ad.jpg`, `/images/events-past/PATH-TO-LOVE.jpg`, `/images/events-past/BIRTHDAY-SHOW-yes.jpg`, `/images/events-past/Love-Heals-Poster-plusInfo.jpg`, `/images/events-past/Deep-Listening-and-sound-healing-concert.jpg`, `/images/events-past/Biggest-8.5x11_Final.jpg`, `/images/events-past/3EventPage_print-compressed_1.jpg`, `/images/events-past/MudLotus.jpg`, `/images/events-past/LAURA-postcard-5inx7in-v-FRONT.jpg`, `/images/events-past/Oh-My-Word-poster.jpeg`, `/images/events-past/Crawdads-8.5x11_1-GOOD-ONE.jpg`, `/images/events-past/Ammonite-85X11-FINAL-USE-THIS-ONE.jpg`, `/images/events-past/kiora-fox_C-No-Ph-1-Feb-Mar-2022-dates-150px.jpg`, `/images/events-past/Michael-8.5-x-11-FINAL_2_cropped-pdf.jpg`, `/images/events-past/Viz-Med-Small_2_cropped-scaled.jpg`, `/images/events-past/unnamed-5.jpg`

## Editing rules

Use the owning dashboard section for canonical content. Preserve authored wording, prices, destinations, media and inline integrations unless the task explicitly authorizes changes. Inspect the template registry and active layout before editing trusted HTML. Inactive source changes require the documented capture; active editor layouts require an explicit migration. Never create a directory-index twin. Upload unique assets, then change only the intended reference. Do not copy credentials into HTML or bypass publication filters.

## Full-stack and release checks

Read ../STACK.md and ../CONTENT_AND_OPERATIONS.md. Settings, About and SEO can be materialized during build. Test real rewrite routes, data loading/fallbacks, relevant links/media, phone/desktop rendering and the published result. Confirm no shadow directory wins routing. Follow ../RELEASE_AND_TESTING.md for expected-head main updates and deployed asset verification. Keep this source inventory current when hooks or ownership change.
