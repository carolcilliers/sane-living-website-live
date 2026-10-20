# Team Workflow — Sane Living Website

## Roles
- **Carol** — business owner, repository owner/admin. Approves production changes, repo visibility, and domain changes.
- **Paul** — technical administrator/developer (collaborator; invite pending his GitHub username).
- **Sophia** — developer (GitHub: `SophiaRose369`, write access).
- **Muse / ChatGPT** — AI development agents working through their authorized GitHub integrations.
- **Karol** — operations; uses the team dashboard (no GitHub account needed — the dashboard login is a shared team username/password by design).
- Devin is **not** part of the new development team and is not a collaborator on this repository.

## GitHub permissions
- Only collaborators can push; the public (once Carol approves visibility) can read/fork but not write.
- Suggested: Carol = Admin; Paul = Admin or Write; Sophia = Write.

## Branch strategy
- `main` — production. Deploys automatically to the production URL.
- `feature/<short-name>` — new work. `fix/<short-name>` — bug fixes.
- Changes reach `main` by pull request so Vercel posts a preview link for review before merge.
- If the account plan supports it, enable branch protection on `main` (require PR). On the free plan, treat "PR before merge" as a team rule.

## Day-to-day
- Website content (events, photos, prices, text): use the team dashboard at `/dash/` (footer "Team Login" button on the site) — no git knowledge needed.
- Code changes: branch → PR → preview → review → merge → production.
- Never commit secrets. Environment variables live in Vercel only; see `.env.example` for the list of names.
- Never force-push `main`.
