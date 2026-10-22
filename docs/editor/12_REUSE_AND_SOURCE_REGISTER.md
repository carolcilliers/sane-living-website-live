# Reuse boundaries and source register

The original assessment is preserved in [reference](reference/INITIAL_REPOSITORY_ASSESSMENT.md), including detailed source links. All five upstream heads were rechecked during this preparation and remained unchanged.

## Upstream decision

| Repository / pinned head | Reuse boundary | Evidence / obligation |
| --- | --- | --- |
| [OpenPage](https://github.com/buildingopen/openpage/tree/9818eb43a88e01b23cb55752e19902d8285a853b) | Conditional editor UI/state patterns, not full app/deploy backend | MIT root; retain notices; audit selected transitive dependencies; core proof required |
| [Framely](https://github.com/belastrittmatter/Framely/tree/943d254020710560da36e9afc328c49269c00f6c) | Property/layout/selection references; no Clerk/Prisma/Next platform import | MIT root; any copied files need provenance/notices |
| [Visual Composer](https://github.com/VisualComposer/builder/tree/29374072a05b47f86090dac29825af9665b01048) | Product/UX reference; no code imported | WordPress dependencies; conflicting GPL root/package declarations require resolution for copying |
| [Piper](https://github.com/fireyy/piper/tree/55f254709184991d26d37327e6408a9cedfc7654) | Conceptual reference only | No project license identified in assessed root/manifest; exclude code copying |
| [website-editor](https://github.com/mars9541/website-editor/tree/356bd1dd5bbc2452578cea7aec71bb4c8b70dfd6) | VvvebJs selection/import reference; separate experiment only if needed | Apache root plus credits/plugin/asset review and upstream provenance check |

These observations are a technical reuse inventory, not a blanket legal clearance for every bundled asset or dependency. Do not copy premium/cloud templates or unrelated icon/media collections merely because a repository is public.

## OpenPage extraction checklist

Candidate concepts/files to inspect: `src/blocks/types.ts`, `registry.tsx`, `BlockWrapper.tsx`, `src/editor/LayersPanel.tsx`, properties controls, `Canvas.tsx`, editor/config stores. The implementation must record which files were actually copied, their original path/hash/license and the modifications made.

Exclude or replace: project/dashboard/deploy routes, localStorage-only authoritative persistence, direct `/api/deploy`, deploy-access-key settings, AI generation orchestration, mock-success Contact/Newsletter behavior, independent HTML-export renderer and production Play CDN dependency.

Do not preserve upstream bugs merely to ease merging. Maintain a small adapter surface so upstream UI updates cannot change Sane Living publication semantics.

## Current Sane Living evidence

Base source URL: [repository at reviewed commit](https://github.com/carolcilliers/sane-living-website-live/tree/3e020ae628ae609345d3906a5d8180d293fd05ff).

| Evidence | Paths |
| --- | --- |
| Existing content contract | `docs/CONTENT_STUDIO.md` |
| Shared auth/session | `api/_dashlib.js`, `dash-login.js` |
| Legacy auth retired/token handoff removed | `api/auth.js`, `callback.js`, `public/admin/config.yml` |
| Content allowlist/draft/public writes | `api/_contentlib.js`, `dash-content.js`, `dash-save.js` |
| Airtable source/write behavior | `api/dash-events.js`, `calendar-events.js`, `calendar-events-past.js` |
| Settings schema/adapters | `public/site-config.js`, `site-content.js`, `content/settings.json` |
| About schema/build | `public/content-model.js`, `content/about.md`, `scripts/build-content.cjs`, philosophy template |
| Public route/interaction behavior | `vercel.json`, public HTML destinations, `public/script.js` |
| Existing regression tests | `tests/content-api.cjs`, `studio-flow.cjs`, `studio-settings.cjs`, `qa-server.cjs` |

The generated [baseline manifest](inventories/baseline-manifest.json) records fetched paths and hashes. It intentionally does not distribute the complete website source or secrets. Use current GitHub source for implementation, not an old scratch working directory.

## Official platform references checked

- [GitHub Git trees](https://docs.github.com/en/rest/git/trees): tree changes require a commit and ref update to become branch state.
- [GitHub Git commits](https://docs.github.com/en/rest/git/commits): commits identify a tree and parent history.
- [GitHub Git references](https://docs.github.com/en/rest/git/refs): non-force updates require fast-forward history.
- [Vercel Git integration](https://vercel.com/docs/git): production-branch pushes trigger configured production deployments.
- [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json): static filesystem precedence matters for rewrites.
- [Vercel rewrites](https://vercel.com/docs/routing/rewrites): same-application route configuration.
- [Vercel webhooks](https://vercel.com/docs/webhooks/webhooks-api): verify the signature for the chosen configured webhook mechanism; do not confuse a webhook with a deploy hook.
- [Vercel project settings](https://vercel.com/docs/project-configuration/project-settings): build/deployment settings must be checked in the actual team/project.

Platform capabilities may change. Recheck the exact API/version and credential scope during implementation. The contract deliberately avoids pinning unverified provider pricing, plan entitlements or a specific new auth/storage vendor.


## October 22: Instatic and Webstudio

Instatic (MIT, Copyright 2026 David Babinec): actual adapted insertion resolver and module wireframe definitions in `editor/src/vendor/instatic/`; served notice `/licenses/instatic.txt`. Upstream tree `1a7ab33ff1614e80b2f618b284dd55b0e2b9d9ae`. Webstudio root AGPL-3.0, inspected tree `dabaeede024afca8fd3db63406958be3cae75ba9`: architecture reference only, no source copied. Integration scope and source paths are documented in guide 19. Neither full CMS/backend is embedded.
