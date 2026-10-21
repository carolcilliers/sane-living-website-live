# saneliving.com — Agent Context

Static marketing site for SANE Living, on Vercel. **Not** `sane-community`
(`~/Antigravity/sane`, repo `sarapis/sane-community`) — two different sites, two
different repos, easy to confuse. Current remote: `carolcilliers/sane-living-website-live`. All work lands on `main`; the repo has never used a PR or a branch.

## Layout

| path | what |
|---|---|
| `public/` | the entire served site — Vercel's output dir |
| `public/script.js` | nav + footer injection, scroll/mobile nav, gallery modal (342 lines) |
| `public/style.css`, `subpage.css` | all styling |
| `public/admin/` | Decap CMS (`config.yml`, GitHub backend) |
| `api/` | two Vercel serverless functions, Airtable-backed |
| `assets/` | print/offline assets (QR codes). Repo root is **not** served |

## ⚠️ Filesystem beats rewrites — never reintroduce a directory twin

Vercel resolves static files **before** `vercel.json` rewrites. If both
`public/X.html` and `public/X/index.html` exist, the directory wins and the
rewrite never fires, so edits to the `.html` file silently do nothing.

Ten pages were in this state and have been collapsed (`a1224da`, `3dd9ada`).
**One file per route:** every page is `public/<name>.html` plus a rewrite. Do not
create `public/<name>/index.html`. The only index files left are the homepage and
`/admin/` (Decap CMS), and every rewrite destination in `vercel.json` resolves to
a real file — keep both true.

`public/events/` still exists, holding `past.html` and
`ojai-health-intensive.html`, which are rewrite destinations themselves. Adding
an `index.html` there would shadow `/events/` again.

To scan for regressions, resolve the route from `vercel.json` — do **not** derive
it from the filename. `tr '-' '/'` turns `lifestyle-ai-algo` into
`lifestyle/ai/algo`, which is why the first sweep missed seven of the ten:

```bash
python3 -c "
import json,os;v=json.load(open('vercel.json'))
for r in v['rewrites']:
    d,x='public'+r['destination'],os.path.join('public',r['source'].strip('/'),'index.html')
    if os.path.exists(d) and os.path.exists(x): print('SHADOWED',r['source'],'<--',x)
"
```

A page's `og:url` must be its real route, not its filename — `/self-heal/eat/`,
never `/self-heal-eat`, which 404s. Verify against the deployed site, since a
stale local file can look correct while serving nothing.

## Deployment — current live repository

This repository is connected to Vercel. Commits to `main` trigger deployment;
check the commit's Vercel status before claiming a change is live.
`vercel.json` explicitly runs `npm run build` and serves `public/` while the
serverless functions remain in root `api/`.

`npm run build` materializes published About sections, favicon and search/share
metadata. Keep that build step during a frontend redesign, or replace its
rendering against the same stable content contract.

## Content Studio contract

Read `docs/CONTENT_STUDIO.md` before changing settings, publication or page
rendering. `public/site-config.js` is the shared settings schema/defaults and
validation contract. Use its stable keys and the documented frontend hooks when
redesigning. Drafts live outside the public output in `dashboard-drafts/`;
published data remains in `public/content/`. Staff content writes must preserve
both the published SHA and shared-draft SHA checks. Never bypass stale-write
protection or replace a failed load with blank content and allow publishing.

The About editor uses structured fields backed by `public/content/about.md`;
unknown metadata and text after frontmatter must survive edits. The existing
Airtable event API and publish filter remain independent of the editable
availability/inquiry embed URLs.

## API + environment

`api/calendar-events.js` and `api/calendar-events-past.js` read a published-events
view from Airtable (`filterByFormula: {Publish} = TRUE()`, max 100 records).

- `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID` — set on Vercel, **Production only**.
  Preview and development deploys return `500 Airtable configuration missing`.
- `AIRTABLE_CALENDAR_TABLE` — unset; falls back to hardcoded `tblIqFjxxfbOgwuQu`.
- `?debug=1` returns raw Airtable field names; `?debug=2` skips the publish filter.

## Decap CMS

`public/admin/config.yml` uses the GitHub backend against `main`, so edits commit
directly to production's branch. Its `pages/about` collection points at
`content/about.md`, but the file lives at `public/content/about.md` — verify that
path resolves before relying on the CMS. `local_backend` is commented out; for
local editing run `npm run cms` and uncomment it.

## Conventions

- Commit straight to `main` — this repo has never used a PR or a branch.
- `.vercel`, `.env`, `.env.local`, `node_modules/` are gitignored; keep secrets out.
- Carol Cilliers (`carolcilliers@icloud.com`) also commits here; don't assume you
  are the only writer — `git pull` before starting.

## Known issues

- Contact form is dead code: `initContactForm()` posts to `/api/contact`, which
  does not exist (404), and no page defines `#contact-form`.
- Upcoming events render empty because nothing has `Publish` ticked in Airtable,
  not because the API is broken. Compare `/api/calendar-events` against
  `/api/calendar-events?debug=2` to tell a data gap from an outage.


## Website Studio

Read `docs/editor/14_WEBSITE_STUDIO_GUIDE.md` and `IMPLEMENTATION_STATUS.md` before editing the studio. The old About transfer pilot is replaced by a whole-site, structured editor. About belongs in Page Editor; Settings stays last.

`content-core/site.cjs` is shared by browser, preflight and build. Registered trusted source snapshots live in `content/page-templates.json`. `scripts/build-pages.cjs` activates only explicitly published layouts, followed by the existing canonical content build. Preserve source IDs/scripts and canonical content ownership. New frontend source changes require a matching template capture; active layouts need an explicit migration.

Drafts, staged images and immutable preview snapshots stay in browser IndexedDB. `api/studio.js` publishes a validated reviewed snapshot through one non-force commit directly to main. Save is not Publish; accepted commit is not verified live. The existing staff cookie and server-side CMS GitHub credential remain required. No shared private database, per-user roles or durable deployment worker is installed.

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`. `npm run dev:editor` is fixture-backed and never writes real services. Compiled `public/dash/editor/` is generated and ignored. Do not commit test layouts or test release descriptors.
