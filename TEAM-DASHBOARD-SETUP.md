# Sane Living — Team Dashboard Setup & Guide
Built Oct 20, 2026 on the `website-update` branch. Dashboard: Decap CMS at `/admin/`
(this file lives at the repo root, which is NOT served on the public site).

## What was built
The dashboard that was already installed (Decap, About page only, pointing at
Devin's repo by mistake) was fixed and expanded. It now edits, on Carol's repo
`carolcilliers/saneliving-website`, branch `website-update`:

- **Events** → `public/content/events.json` (the Home and Events pages read this
  file first; the old Airtable API is now only a fallback)
- **Photo Gallery** → `public/content/gallery.json` + uploads to `public/images`
  (new public page: `/gallery/`; the Rent page photo viewer reads it too)
- **Weddings Page** → `public/content/weddings.json` (the Weddings page reads it;
  old text remains as fallback)
- **Pricing & Rates** → `public/content/pricing.json` (rate table on the Pricing
  page is rebuilt from this; the printed table remains as fallback)
- **Partners** → `public/content/partners.json` (new public page: `/partners/`,
  also linked under Rent in the menu). ONLY add a partner after they agree.
- **Settings** → `public/content/settings.json` (phone, email, address, hours,
  calendar embed link, social links — the team's master record)
- **Pages → About** → `public/content/about.md` (kept from the original setup;
  its file path was fixed from `content/about.md` to `public/content/about.md`)

Saving in the dashboard commits to the `website-update` branch, and Vercel
auto-deploys that branch to its preview address. Nothing touches the live
site (`main`) until the branch is merged.

## How login works — username + password (changed Oct 20, 2026, at Carol's request)
The team does NOT log in with GitHub. `/admin/` opens a username + password
form served by this repo (`api/auth.js`):

- **Username:** `saneliving` (can be changed with the `CMS_LOGIN_USER`
  variable in Vercel; default is `saneliving`).
- **Password:** whatever Carol set as `CMS_LOGIN_PASSWORD` in Vercel.
  It is NOT in the code and NOT in this repo — it lives only in Vercel's
  encrypted environment variables. Please do not use `1234`: the password
  is the only lock on the site's editing.
- Behind the form, edits are saved to GitHub using `CMS_GITHUB_TOKEN` — a
  GitHub token limited to THIS repo's contents only, also stored only in
  Vercel. Team members need no GitHub account and never see the token.
- It is one shared team login. If someone leaves, change
  `CMS_LOGIN_PASSWORD` in Vercel (and redeploy the branch) — done.
- Wrong passwords are slowed down on purpose (a short delay per try).
- The earlier GitHub-OAuth attempt is retired: `api/callback.js` is now just
  an explanation page, and the `OAUTH_GITHUB_CLIENT_ID/SECRET` variables and
  the "Sane Living Dashboard" OAuth App can be deleted.

## One-time setup for the password login (Carol) — DONE Oct 20, 2026
Carol added CMS_GITHUB_TOKEN and CMS_LOGIN_PASSWORD to the Vercel project
(Preview + Production) on Oct 20, 2026; the branch was rebuilt afterwards
and the login form verified live.
(Vercel Deployment Protection must be None for this project — done Oct 20,
2026, so the team can open the preview address at all.)

1. Create the editing token on github.com (signed in as carolcilliers):
   profile picture → Settings → Developer settings → Personal access tokens
   → **Fine-grained tokens** → Generate new token.
   - Name: `Sane Living Dashboard`
   - Expiration: 1 year (put a renewal reminder on the calendar)
   - Resource owner: carolcilliers
   - Repository access: **Only select repositories** → `saneliving-website`
   - Permissions → Repository permissions → **Contents: Read and write**
     (leave everything else at "No access")
   - Generate token and copy it (starts with `github_pat_`). Shown once.
2. On vercel.com → project `saneliving-website` → Settings → Environment
   Variables, add (tick Preview + Production for each):
   - `CMS_GITHUB_TOKEN` = the token from step 1
   - `CMS_LOGIN_PASSWORD` = the team password you choose
   - (optional) `CMS_LOGIN_USER` = a different username than `saneliving`
3. Trigger a NEW deployment of the **`website-update` branch** — env vars
   only apply to deployments built after they were added, and redeploying a
   `main`/Production deployment does NOT refresh the preview (that exact
   mix-up cost a round trip on Oct 20). Easiest: tell Muse "done" and it
   pushes a small commit, which rebuilds the branch automatically.
4. Open `https://saneliving-website-git-website-update-carol-cilliers.vercel.app/admin/`,
   click Login, and use the team username + password.

Until step 2 is done, the login page shows "Login not set up yet" — that is
expected, not a breakage.

## When V2 is approved and merged to `main`
Two config changes in `public/admin/config.yml` (Muse can do these at merge):
- `backend.branch: website-update` → `main`
- `backend.base_url` and `site_url`: the `-git-website-update-` preview URL →
  `https://saneliving-website-one.vercel.app`
The Vercel env vars (CMS_GITHUB_TOKEN, CMS_LOGIN_PASSWORD) do not change.

## Day-to-day editing (the 30-second version)
1. Go to the site `/admin/` and log in with the team username + password.
2. Pick a section on the left: Events, Photo Gallery, Weddings Page,
   Pricing & Rates, Partners, Settings, Pages (About).
3. Edit the fields, click Save (top right). The change is committed and the
   preview site rebuilds in about a minute.
4. Photos: use the image field's upload — new photos are stored in the repo
   under `/images` automatically.

## Design (Oct 20, 2026)
- **DESIGN.md at the repo root** is the site's design system (colors,
  typography, components, motion/accessibility checklist) — follow it for any
  page work so everything stays consistent.
- The public pages carry a "V2 DESIGN POLISH" layer: style.css (bottom
  section) + calendar overrides in events.html + gallery/partners styles.
  Heroes are plum→purple gradient bands; buttons are pills; cards use soft
  shadows. Dashboard editor preview uses `/style.css` + `/admin/preview.css`.
- Dashboard theme (Oct 20, 2026, 2nd pass): `public/admin/theme.css` restyles
  Decap's own screens in brand purple/Nunito via stable selectors (Decap's
  hashed classes are never targeted). The /api/auth login form got the same
  treatment (gradient card, pill button). Still Decap underneath — layout is
  theirs, colors/type/feel are ours.

## Calendar sync (Oct 20, 2026)
Events are Airtable-authoritative — see
`files/calendar-sync-report.md` in the goal workspace (Muse's copy) for the
full Phase 1–3 report. Branch pages read events ONLY via /api/calendar-events;
the old content/events.json is retired (tombstone) and the Decap Events
collection was removed so there is exactly one calendar system. The custom
dashboard's Events panel will manage Airtable directly (needs AIRTABLE_*
env vars with a read+write token in this Vercel project).

## Custom dashboard (Oct 20, 2026) — /dash/
Carol chose a custom dashboard over Decap's screens. It lives at **/dash/** on
each deployment (Decap stays at /admin/ as a fallback; both edit the same
content). Single page: sections open in place; photo cards with thumbnails;
same team username/password (session cookie via /api/dash-login).
- Content sections save the /content/*.json + about.md via /api/dash-save
  (git commits to this branch using CMS_GITHUB_TOKEN, server-side only).
- Events are NOT a file: the Events panel manages the Airtable calendar via
  /api/dash-events (see the calendar-sync report). It needs AIRTABLE_API_TOKEN
  (read+write) + AIRTABLE_BASE_ID in Vercel; until then it shows a clear
  "not connected" banner and changes nothing.
- At merge: flip api/dash-save.js BRANCH (or DASH_BRANCH env) to main.
- Round 2 (Oct 20, 2026): Home shows a real venue month calendar + upcoming
  list (from the events feed); gallery is grouped by website section
  (Venue / Weddings / Outdoor) with per-section uploads; Settings grouped
  into Contact / Booking & availability / Social cards; About got a word
  count + clearer preview card; all save bars say "Save & Publish".
  dash-events GET falls back to the LIVE site's public feed (read-only)
  when this project has no AIRTABLE_* keys — viewing works today, managing
  events still requires the token.
