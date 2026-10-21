# Current Settings field ownership

Exact published keys from the pinned source. Values are intentionally omitted. Runtime validation/defaults remain in `public/site-config.js`. Every row is globally owned by Settings; visual controls project the same field, never save a duplicate.

| Key | Category | Type | Binding / scope |
| --- | --- | --- | --- |
| `announcementEnabled` | Announcement | boolean | `settings.announcementEnabled`; global |
| `announcementLinkLabel` | Announcement | string | `settings.announcementLinkLabel`; global |
| `announcementLinkUrl` | Announcement | string | `settings.announcementLinkUrl`; global |
| `announcementText` | Announcement | string | `settings.announcementText`; global |
| `availabilityEmbedUrl` | Booking | string | `settings.availabilityEmbedUrl`; global |
| `bookingPageUrl` | Booking | string | `settings.bookingPageUrl`; global |
| `rentalFormUrl` | Booking | string | `settings.rentalFormUrl`; global |
| `businessName` | Branding | string | `settings.businessName`; global |
| `faviconUrl` | Branding | string | `settings.faviconUrl`; global |
| `footerText` | Branding | string | `settings.footerText`; global |
| `logoAlt` | Branding | string | `settings.logoAlt`; global |
| `logoUrl` | Branding | string | `settings.logoUrl`; global |
| `address` | Contact and social | string | `settings.address`; global |
| `contactFormUrl` | Contact and social | string | `settings.contactFormUrl`; global |
| `directionsUrl` | Contact and social | string | `settings.directionsUrl`; global |
| `email` | Contact and social | string | `settings.email`; global |
| `facebookUrl` | Contact and social | string | `settings.facebookUrl`; global |
| `hours` | Contact and social | string | `settings.hours`; global |
| `instagramUrl` | Contact and social | string | `settings.instagramUrl`; global |
| `mapEmbedUrl` | Contact and social | string | `settings.mapEmbedUrl`; global |
| `phoneDisplay` | Contact and social | string | `settings.phoneDisplay`; global |
| `phoneLink` | Contact and social | string | `settings.phoneLink`; global |
| `homeHeading` | Homepage | string | `settings.homeHeading`; global |
| `homeIntro` | Homepage | string | `settings.homeIntro`; global |
| `homePosterUrl` | Homepage | string | `settings.homePosterUrl`; global |
| `homePrimaryLabel` | Homepage | string | `settings.homePrimaryLabel`; global |
| `homePrimaryUrl` | Homepage | string | `settings.homePrimaryUrl`; global |
| `homeVideoUrl` | Homepage | string | `settings.homeVideoUrl`; global |
| `navigation` | Navigation | array | `settings.navigation`; global |
| `newsletterButton` | Newsletter | string | `settings.newsletterButton`; global |
| `newsletterDescription` | Newsletter | string | `settings.newsletterDescription`; global |
| `newsletterEnabled` | Newsletter | boolean | `settings.newsletterEnabled`; global |
| `newsletterTitle` | Newsletter | string | `settings.newsletterTitle`; global |
| `newsletterUrl` | Newsletter | string | `settings.newsletterUrl`; global |
| `schemaVersion` | Schema | integer | `settings.schemaVersion`; global |
| `defaultShareImage` | Search and sharing | string | `settings.defaultShareImage`; global |
| `pageMeta` | Search and sharing | object | `settings.pageMeta`; global |
| `siteDescription` | Search and sharing | string | `settings.siteDescription`; global |

`navigation` contains approved existing route/label/visible rows. It does not create pages. `pageMeta` contains per-route title/description/image overrides; their page-local effect is still stored in the global Settings resource during the compatibility phase. `schemaVersion` is developer-managed.

Total: 38 top-level published keys. Additional supported defaults must be read from the schema before implementation; current file keys alone are not a complete validator.
