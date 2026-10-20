# Backend Integrations — Sane Living Website

The site is a static frontend plus small serverless functions in `api/` (Vercel). There is **no database** and no framework; durable data lives in (1) files in this repository and (2) Airtable.

## Authentication (team dashboard + Decap)
- Provider: custom username + password, implemented in `api/dash-login.js` (dashboard) and `api/auth.js` (Decap). Credentials are compared server-side against Vercel env vars (`CMS_LOGIN_USER` / `CMS_LOGIN_PASSWORD`) using timing-safe comparison.
- Sessions: signed, HttpOnly cookie (`sl_dash`, HMAC-SHA256, 7 days) issued by `api/_dashlib.js`. All administrative API routes check the session server-side (`requireLogin`). Visiting a dashboard URL without a session shows only the login screen — no admin data or actions are exposed.
- Saves: `api/dash-save.js` commits content changes to git using `CMS_GITHUB_TOKEN` (fine-grained token, Contents read/write, scoped to one repository) — the token exists only as a Vercel env var. A strict path whitelist limits what can be written.
- Password reset: there is no self-service reset; Carol changes `CMS_LOGIN_PASSWORD` in Vercel and redeploys.

## CMS
- **Decap CMS** at `/admin/` (`public/admin/config.yml`), pointed at this repository's `main` branch, authenticating through the same team password flow (`api/auth.js`). Content collections write the same files the custom dashboard writes.
- **Custom dashboard** at `/dash/` (`public/dash/`) — the team's primary tool. Content lives in `public/content/` (`gallery.json`, `weddings.json`, `pricing.json`, `partners.json`, `settings.json`, `about.md`); public pages read those files with static fallbacks.
- Media uploads through the dashboard are committed to `public/images/` via the save API (no external object storage).

## Calendar (do not replace)
- Provider: **Airtable**. Events are authored in an Airtable base (calendar table `tblIqFjxxfbOgwuQu`, overridable via `AIRTABLE_CALENDAR_TABLE`); the Airtable base is authoritative.
- Public feed: `api/calendar-events.js` (upcoming, only records with Publish = true, "Public *" fields take precedence, times converted to America/Los_Angeles, event id = Airtable record id) and `api/calendar-events-past.js`. Requires `AIRTABLE_API_TOKEN` + `AIRTABLE_BASE_ID` in the serving Vercel project.
- Availability calendars on Pricing/Weddings are an Airtable shared-view **embed** (URL stored in `public/content/settings.json` → `availabilityEmbedUrl`).
- Dashboard Events panel (`api/dash-events.js`) manages the same Airtable table directly (create = POST, edit = PATCH by record id, delete = DELETE, unpublish = Publish off) — it keeps no event store of its own, so no sync duplicates or loops are possible. Without Airtable keys it falls back to reading the live site's public feed read-only.

## External services
- Mailchimp: newsletter signup form in the footer (`public/script.js`) posts to a Mailchimp list URL (public form endpoint, not a credential).
- Tagvenue: external listing (no code integration).

## Access required
- Vercel project owner: Carol (env vars, domains, Git connection).
- Airtable base owner: Carol/Devin (token issuance).
- GitHub: repository collaborators per TEAM_WORKFLOW.md.
