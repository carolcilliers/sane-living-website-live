# Deployment Guide — Sane Living Website

## Hosting
- Platform: **Vercel** (Hobby plan).
- Existing project: `saneliving-website` (Carol's account), currently connected to the ORIGINAL repository `carolcilliers/saneliving-website`, production domain `saneliving-website-one.vercel.app`.
- New repository: `carolcilliers/sane-living-website-live` — to deploy from it, either (a) change the existing project's connected Git repository to the new repo (Vercel → Project → Settings → Git), keeping all env vars and settings, or (b) create a new project importing the new repo and copy the env vars. Option (a) is simpler and preserves the production URL. **Do not disconnect the existing production deployment until the new connection is verified.**
- Framework preset: **Other** (plain static site, no framework). Build command: none. Output: Vercel serves `public/` as the web root; files in `api/` deploy as serverless functions automatically. Root directory: repository root. `vercel.json` carries all rewrites/redirects — do not add build settings that override it.

## Environment variables (names only — values live in Vercel, never in git)
See `.env.example`: `CMS_LOGIN_USER` (optional), `CMS_LOGIN_PASSWORD`, `CMS_GITHUB_TOKEN`, `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_CALENDAR_TABLE` (optional), `DASH_BRANCH` (optional), `LIVE_EVENTS_FEED_URL` (optional).
Note: `CMS_GITHUB_TOKEN` must be re-issued for THIS repository before the dashboard can save from a deployment of this repo (the current token is scoped to the original repo only).

## Domain
- Production domain: **saneliving.com**, currently served by a separate Vercel deployment under Devin's project (his project holds the working Airtable keys). Carol's project serves the same site at `saneliving-website-one.vercel.app`.
- Cutover procedure (requires Carol's explicit approval before executing):
  1. Confirm the deployment from this repository passes all checks (pages, /dash login, dashboard saves, calendar feed, mobile).
  2. In the Vercel project that will serve production from this repo, add the domain `saneliving.com` (and `www.saneliving.com` with a redirect to the root, matching current behavior).
  3. Update DNS at the registrar only if Vercel instructs it (the domain already points at Vercel, so normally only the project assignment changes — coordinate with whoever controls the current project/registrar).
  4. Verify HTTPS certificate issuance, root/www redirects, and the dashboard login on the real domain.
- Rollback: re-assign the domain to the previous project/deployment; the original repository and its deployments are untouched by this migration, so the previous production can be restored by domain reassignment alone.

## Release procedure
1. Work on a `feature/*` or `fix/*` branch.
2. Open a pull request into `main`; Vercel builds a preview URL on the PR.
3. Review on the preview (pages + dashboard).
4. Merge → production deploys automatically from `main`.
