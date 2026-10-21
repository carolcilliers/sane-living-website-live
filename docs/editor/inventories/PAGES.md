# Current public page inventory

Source-derived at the pinned baseline. Classification/wave are proposed, not completed migrations. Canonical routes come from current rewrites; alias lists are in `pages.json`.

| Route | Source | Authority / special dependency | Migration class | Wave |
| --- | --- | --- | --- | --- |
| `/about/` | `public/about.html` | About Markdown + build; shared layout/settings only | adapter pilot | 1 |
| `/contact/` | `public/contact.html` | HTML + Settings; airtable.com, www.google.com | forms / embeds | 3 |
| `/events/ojai-health-intensive/` | `public/events/ojai-health-intensive.html` | HTML + media; player.vimeo.com | custom media | 4 |
| `/events/past/` | `public/events/past.html` | HTML + Airtable / Settings; /api/calendar-events-past | live data / shared integration | 4 |
| `/events/` | `public/events.html` | HTML + Airtable / Settings; /api/calendar-events, saneliving.us19.list-manage.com | live data / shared integration | 4 |
| `/evo3/` | `public/evo3.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/gallery/` | `public/gallery.html` | HTML + collection JSON; /content/gallery.json | collection / functional | 3 |
| `/` | `public/index.html` | HTML + Airtable / Settings; /api/calendar-events, local-video, www.google.com | live data / shared integration | 4 |
| `/inspiration/` | `public/inspiration.html` | HTML + media; www.youtube.com | custom media | 4 |
| `/lifestyle/ai-algo/` | `public/lifestyle-ai-algo.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/lifestyle/evo3/` | `public/lifestyle-evo3.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/lifestyle/natures-bio/` | `public/lifestyle-natures-bio.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/lifestyle/sapiens-ego/` | `public/lifestyle-sapiens-ego.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/lifestyle/` | `public/lifestyle.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/partners/` | `public/partners.html` | HTML + collection JSON; /content/partners.json | collection / functional | 3 |
| `/rent/farm/` | `public/rent-farm.html` | HTML + media; local-video | custom media | 4 |
| `/rent/pricing/` | `public/rent-pricing.html` | HTML + collection JSON; /content/pricing.json, airtable.com | collection / functional | 3 |
| `/rent/weddings/` | `public/rent-weddings.html` | HTML + collection JSON; /content/weddings.json, airtable.com | collection / functional | 3 |
| `/rent/` | `public/rent.html` | HTML + Settings; airtable.com | forms / embeds | 3 |
| `/sculpture/` | `public/sculpture.html` | HTML + media; player.vimeo.com | custom media | 4 |
| `/self-heal/destress/` | `public/self-heal-destress.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/self-heal/detox/` | `public/self-heal-detox.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/self-heal/eat/` | `public/self-heal-eat.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/self-heal/move/` | `public/self-heal-move.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |
| `/self-heal/` | `public/self-heal.html` | HTML; shared layout/settings only | editorial / template candidate | 2 |

All routes retain their current output destination until explicit cutover. Wave 1 = About pilot; 2 = editorial templates; 3 = collections/forms; 4 = live-data/custom-media review. Never derive routes by globally replacing filename hyphens with slashes.

Total: 25 marketing HTML destinations. Staff dashboard/admin are excluded. Snapshot shows 48 rewrite entries and 43 redirect entries; their exact configuration remains authoritative.
