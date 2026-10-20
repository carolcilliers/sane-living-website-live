# Migration Report — Sane Living Website

**Date:** October 20, 2026
**Original repository:** https://github.com/carolcilliers/saneliving-website (private fork of Devin Balkind's private repository — left fully intact)
**Destination repository:** https://github.com/carolcilliers/sane-living-website-live (independent, no fork relationship)
**Source migrated:** branch `main` at commit `3c0f0769753616af1a09508677c5224c5526ba84` (merge of the V2 redesign + team dashboard)

## Migration method
- Snapshot transfer: every file was read from the source repository at the commit above (text/backend files via the GitHub API; public assets via the verified production deployment) and written to the destination as a **fresh Git history**. No commits, branches, or history from the private fork were copied.
- Integrity: **155 of 156 files verified byte-size-identical** to the source manifest. The single intentional difference is `.gitignore`, extended with `.env.*` protection (see below). A new `.env.example` was added.
- Excluded: nothing in the source tree was generated/cache content; `node_modules`, `.env`, `.vercel` were already covered by `.gitignore` and are not in the tree.

## What transferred (156 files, ~59 MB)
- `public/` — the complete static website: all pages, `style.css`/`subpage.css`, `script.js` (nav/footer injection, incl. the footer **Team Login** button), 90 images, hero videos, `public/content/*.json` + `about.md` (dashboard-managed content), `public/admin/` (Decap CMS), `public/dash/` (custom team dashboard).
- `api/` — serverless functions: `calendar-events.js`, `calendar-events-past.js` (Airtable feed), `auth.js` + `callback.js` (Decap login), `dash-login.js`, `dash-save.js`, `dash-events.js`, `_dashlib.js` (dashboard session/save/events).
- `vercel.json` (48 rewrites, 43 redirects), `package.json`, `assets/`, `DESIGN.md`, `CLAUDE.md`, `TEAM-DASHBOARD-SETUP.md`.

## Verification results
- Source production deployment (from the migrated commit) is live and passing: home 200, `/dash/` 200, footer Team Login present, login API rejects bad credentials (401) and accepts the team's (confirmed by Carol on the preview).
- Security audit of the full tree: **no API keys, tokens, passwords, private keys, or credentials found in any file.** All secrets are read from environment variables (see `.env.example`). The only public identifiers are the Airtable base ID inside the public embed URL (public by design) and the business email info@saneliving.com.
- Because the destination starts from a fresh snapshot, its history contains no private-fork commits.

## Known issues
- This Vercel project (Carol's) does **not** yet have `AIRTABLE_API_TOKEN` / `AIRTABLE_BASE_ID` set, so its own `/api/calendar-events` returns "Airtable configuration missing" (pre-existing, unchanged by migration). The public saneliving.com deployment (Devin's project) serves events normally, and the dashboard reads that live feed read-only as a fallback. Adding the two keys fixes both editing and the local feed.
- Event *management* from the dashboard (create/edit/delete in Airtable) requires those keys; until then the Events panel is read-only. No test events have been written to the production Airtable table.

## Outstanding actions
- Carol: approve making this repository public (after reviewing this audit).
- Carol/Paul: add the Airtable keys to the Vercel project(s) that will serve production from this repo.
- Paul: confirm GitHub username so he can be invited as collaborator.
- Domain cutover (saneliving.com → deployment from this repo) is **prepared but not executed** — it requires Carol's explicit approval; see DEPLOYMENT_GUIDE.md.
