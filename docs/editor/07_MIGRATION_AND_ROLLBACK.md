# Migration, route cutover and rollback guide

This is the future operational runbook. No steps that modify production have been executed during documentation preparation.

## Before changing application code

1. Re-read main and compare it with the handoff baseline. Review intervening changes; preserve other authors' work. Do not assume the package remains a live mirror.
2. Read current `CLAUDE.md` and `docs/CONTENT_STUDIO.md`; resolve stale notes using current source/tests rather than copying contradictory statements.
3. Produce a local clean baseline build/test report, route map and content/asset hashes. Preserve exact About source and the philosophy template.
4. Confirm the intended GitHub repository, Vercel project/team and public domain. `saneliving.com` fallback feed and the current `.vercel.app` deployment are not automatically the same configured project.
5. Validate provider/identity permissions using read-only checks. Use isolated test credentials/data for implementation verification.
6. Define flags, a restoration record and who can disable publication. Keep all existing routes in legacy mode initially.

## Migration units

| Unit | Conversion | Cutover condition |
| --- | --- | --- |
| Dashboard shell | Lazy editor mount and scoped CSS/shortcuts | Existing sections/login/save behavior unchanged in browser regression |
| About IDs | One-time stable section ID migration preserving source | Round-trip fixtures and original source backup verified |
| About layout | New page document references adapter-owned sections | Preview/static parity, hidden/suffix/philosophy preservation |
| Write gateway | Existing About/Settings saves delegate for enabled resources | Two interfaces + manual Git conflict scenarios pass |
| Renderer | One explicit owner generates About body | Legacy body generator disabled for that route; metadata pass remains |
| Private drafts | Import legacy shared draft without publishing it | Conflict resolution/recovery and old-write blocking tested |
| Assets | Private staging with immutable public promotion | References and old release assets retained |

## About pilot cutover

### Preparation

Record original `about.md` blob hash, optional shared-draft hash, `about.html`, philosophy template, metadata defaults and settings hashes. Preserve unknown frontmatter and trailing Markdown. Inventory existing images and whether their current URLs remain valid. Create synthetic tests including a hidden Farm section, changed Founder heading, extra metadata and suffix content.

Add stable section IDs using a deterministic one-time mapping persisted in source/migration metadata. Idempotence means a second migration changes nothing; it does not mean deriving IDs from headings repeatedly.

### Proof

Use a copy of content and fake APIs. The source adapter is the only text/order owner. Compare legacy and new semantic content and run screenshots for agreed variants; visual changes can be intentional, lost content cannot. Establish how philosophy is attached without relying on heading text.

### Backend transition

Introduce the gateway behind flags. For enabled About resources, old `/api/dash-save` requests must delegate and retain SHA/version safety. If an old browser is incompatible, return a reload-required message while retaining its recovery data; never accept an unguarded write.

Import any existing shared draft into private storage as a draft revision. The public Git draft has already been publicly stored; deletion does not erase Git history. Do not promise retroactive privacy. Check it contains no secrets; incident handling for any historical sensitive content is separate scope. After import, freeze/retire the old draft writer for that resource and retain a clear migration marker.

### Route cutover

Switch the About route's render owner in an explicit developer-controlled manifest. The output remains `public/about.html`; no directory twin. Disable legacy About body generation for this owner while retaining SEO/favicon generation and other routes. Do not render via both builders in unspecified order.

Commit compatible renderer/manifest/content changes as one reviewed direct-main change after preflight. This is a future implementation action, not implied authorization from the documentation package. Confirm deployed route and content marker. Only then enable normal team publication for the pilot.

## Existing draft recovery

Old localStorage keys are device-specific. Preserve them until the user has successfully imported or exported their work. Match baseline/draft hashes before merging. If published content or a shared draft has moved, open a recovery choice; never replace a teammate's draft with an older local copy automatically.

New editor storage keys should be versioned by site/page/actor. Logging out must not expose one user's private draft to the next shared-device session. Define whether local encrypted/plain recovery is acceptable for the team's devices; avoid storing private preview tokens with content snapshots.

## Staged broader rollout

Use the inventory to select simple editorial pages next. Gallery/Pricing/Partners/Weddings require collection adapters. Contact/Rent require functioning form/availability adapters. Home and Events require live API, newsletter and hero behavior. Video-heavy custom pages require provider embed and performance verification.

Keep current URLs/redirects unless separately requested. Generalized new-page routing requires a route registry, collision checks, SEO/sitemap strategy and tests for the static-files-first behavior. Do not infer canonical paths from filename hyphens.

## Rollback types

| Type | Correct operation | Avoid |
| --- | --- | --- |
| Disable editor UI | Server/developer flag hides editor; legacy forms remain | Removing public site content |
| Stop new publication | Server kill switch blocks new jobs; allow monitoring/recovery | Client-only hidden button |
| Restore page content | New release applying selected prior resource values against current head | Git force reset or reverting unrelated newer changes |
| Restore route renderer | Switch owner back with compatible legacy sources/build and metadata | Both renderers writing the same HTML |
| Emergency hosting rollback | Restore known deployment if authorized; immediately reconcile Git | Leaving main and production divergent indefinitely |
| External event correction | Explicit Airtable record operation using original IDs | Assuming Git rollback reverses Airtable/form submissions |

## Content restore protocol

Choose release and scope. Compare its before/after resource hashes with current state and list affected bindings/routes. If restoring an About page would also revert shared Settings, require explicit inclusion; default to page-local content. Validate old component versions using a compatible renderer/migration; restore all referenced immutable assets. Execute a new normal publication job with current baselines. Preserve private newer drafts for reconciliation.

Never delete a released asset merely because it is absent from current page content. It may be needed by another route or retained release. Garbage collection is reference- and retention-aware, after a dry-run report.

## Emergency checklist

- Record affected route, release, commit/deployment IDs and time.
- Disable new publication if failures are systemic.
- Verify public impact; do not confuse a protected preview with a broken public site.
- Choose smallest reversible restore preserving unrelated work.
- Verify live route/content/integration behavior.
- Reconcile repository, private release heads and hosting state.
- Document cause and add a targeted regression test before reenabling.

