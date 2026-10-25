# Weddings, Pricing and Home refinement

## Problem and resulting workflow

Weddings offered a raw image path instead of a normal photo workflow. Long highlights were truncated in single-line inputs. Pricing exposed a dense matrix of inputs with little session context. Home hid its useful calendar behind a disclosure.

This dashboard-only revision puts the existing main wedding photo beside the title and introduction. Staff can upload PNG/JPEG/WebP/GIF files (up to the existing 4 MB server limit), choose from a searchable, paginated gallery, inspect/edit an image link, or restore the published photo. The picker is a native modal with Escape, keyboard focus containment and focus return. Upload progress and failures appear next to the photo. Overlapping photo selections and structural rerenders are disabled during upload; text editing remains available. Upload stages a unique asset through the existing authenticated API. It does not publish Weddings. Save draft and Publish changes keep their existing meaning and SHA protections.

The wedding collection summary links directly to the open Weddings collection in Photo Gallery, which owns additional photos, captions, order and per-photo publication. It does not introduce an independent duplicate gallery or imply that the main Weddings save publishes gallery drafts. Its working photo count/thumbnails update when staff return from Gallery. Main photo preview has an explicit unavailable state instead of silently disappearing. No crop, background, gallery or public-page capabilities are invented.

Weddings has numbered, named editing sections and keyboard-accessible section links. Highlights use multiline text areas. Package details and venue policies have distinct groups. All original canonical keys and values survive the reorganization.

Pricing now uses one editable card per existing rental session. Each retains its name, hours and four original day-rate strings; no numeric conversion, currency normalization, extra rates or calculations are imposed. Session headings update in place as staff type. Rate details and the booking message have their own groups. Save, recovery and publish still serialize the existing complete JSON object.

Home's month calendar is permanently visible and appears first in the overview. Previous/Next, Today, selecting a date and clearing the date filter use the existing handlers. Real attention/status and published contact information remain present.

## Design and source use

Applied Paul's attached `UI_UX_Polish_Skill_and_Tool_Playbook(2).md` and its OpenDesign guidance. Re-read `skills/impeccable-design-polish/SKILL.md` and `skills/ui-animation/SKILL.md` at OpenDesign commit `9724c44142ea0afaee3d207f37901b31c66a44ad`; previously reviewed sources and boundaries are recorded in PRESENTATION_POLISH_2026-10-25.md.

Decisive changes: deep-plum page headers, lavender section surfaces, warm neutral fields, contrasting primary actions, real venue photography and different compositions for photography versus rates. The recurring controls stay immediate and stable. No decorative animation, new font, film, stock/generated photo, external UI runtime or copied third-party artwork is included. Existing Sane Living imagery and Nunito remain in use. Vercel's verification skill informed the UI → API → fixture repository → public-page check.

## Validation and boundaries

- `tests/dashboard-editorial.cjs` exercises permanent calendar visibility, month/day controls; every Weddings field; photo chooser/Escape/focus return; restore; invalid-upload retention; valid staged upload and its publication lock; the wedding Gallery route; shared draft, refresh recovery and publication; actual public wedding photo/title/highlights. Every Pricing field is edited, saved, recovered and published; actual public rates/date are asserted. A concurrent source update cannot replace an open photo picker.
- Photo picker checked at 320/390/768/1440px, including overflow and axe A/AA checks when AXE_CORE_PATH is supplied.
- `tests/dashboard-presentation.cjs` checks all native pages and Settings categories at 320/390/768/1024/1440/1920px, 200% text at 390/1024, field/control bounds, keyboard actions, focus, reduced motion, and axe A/AA. Updated assertions reflect the authorized replacement of the dashboard rate table with session cards.
- The organization regression now asserts a visible calendar rather than the previous intentionally collapsed one. Whole-gallery preservation, pagination, filtering and saved edits remain covered.
- Existing studio-flow, source-sync, content-api, TypeScript and production build checks protect save/recovery/conflict, sync, authentication and integration boundaries.
- Screenshots reviewed for desktop/phone Weddings, Pricing, Home and the open photo library. Browser testing uses an isolated GitHub/Airtable fixture and temporary built-site copy. It writes no real venue content and is not a physical-device or accessibility certification.

Public website HTML/CSS/content, APIs, Page Editor code, gallery schema and external integrations are outside the implementation diff. Actual staff upload/publish uses the already configured production session and GitHub credential. Release uses one non-forced commit to main with an expected-head check, then deployment status and exact-asset verification.
