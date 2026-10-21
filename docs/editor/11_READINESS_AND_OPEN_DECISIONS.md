# Readiness evidence, risks and open decisions

Prepared October 20, 2026 in America/Los_Angeles. UTC source/probe evidence can fall on October 21. This file separates measured results, source observations and proposals.

## Evidence gathered in this preparation

| Check | Result | Limit |
| --- | --- | --- |
| Current main head | `3e020ae628ae609345d3906a5d8180d293fd05ff` | Recheck before implementation |
| Relevant current source | 65 text files retrieved at pinned ref | Not every binary/asset downloaded or visually inspected |
| Five upstream heads | Same five commits as original assessment | No new runtime usability/security certification |
| Current page destinations | 25 marketing HTML files mapped through route configuration | Classification is proposed migration order |
| Isolated current content API tests | PASS: auth, path allowlist, no-store, shared draft/stale protection, validation, cleanup/revert, image checks | In-memory Git fixture; no authenticated production mutation |
| Public `/` | HTTP 200 | Reachability only, not complete visual check |
| Public `/dash/` | HTTP 200 | Shell reachable; no staff credentials used |
| Public `/content/settings.json` | HTTP 200 | Public settings reachable |
| Unauthenticated `/api/dash-content?section=settings` | HTTP 401, `Not logged in` | Authentication boundary observed for this request |
| `/api/calendar-events` | HTTP 500, `Airtable configuration missing` | Cannot infer which required variable is absent |
| `/api/calendar-events-past` | HTTP 500, same error | Same limitation |
| Vercel project lookup in `carol-cilliers` | HTTP 403 / forbidden | Account/project management metadata inaccessible |
| Vercel CLI fallback | CLI unavailable in this environment | No alternate project inspection performed |
| Fresh browser regression | Not run in this preparation | Chromium executable used previously is no longer present |

The content API suite was also run once against an older local working copy before a fresh-source run. Only the **fresh fetched baseline** result is used as current evidence. The older working directory had source differences and is not the integration authority. Supplemental template/vendor files were matched to the baseline; source-derived hashes are included in the inventory.

## Exact authorization restriction

Read-only Vercel operation: project `sane-living-website-live`, scope `carol-cilliers`.

Returned message:

> Not authorized: Trying to access resource under scope "carol-cilliers". You must re-authenticate to this scope or use a token with access to this scope.

The returned remediation identifies a missing team access grant. This does not establish that Git-triggered builds are broken, that the GitHub connection lacks write access, or that Airtable variables have specific values. Before Vercel management/preview/status setup, the owner must grant the correct team/project scope to the intended integration/runtime credential. Completing unrelated SSO is not evidence of that grant.

## Existing environment inventory

Names only; no values inspected or included. Source code and `.env.example` establish names, not deployed presence.

| Variable | Purpose | Verification needed |
| --- | --- | --- |
| `CMS_LOGIN_USER` | Shared staff username; default exists | Current policy and migration plan |
| `CMS_LOGIN_PASSWORD` | Shared staff password/session secret input | Server presence, rotation/recovery; never put value in docs |
| `CMS_GITHUB_TOKEN` | Runtime repo contents access/session secret input | Actual runtime read/write scope and main rules |
| `AIRTABLE_API_TOKEN` | Event records read/write | Scope/base permission and selected environment |
| `AIRTABLE_BASE_ID` | Event base | Correct base without logging secret token |
| `AIRTABLE_CALENDAR_TABLE` | Optional table override | Correct source, source has fallback table ID |
| `DASH_BRANCH` | Optional write branch override | Must remain intended main workflow |
| `LIVE_EVENTS_FEED_URL` | Read-only staff fallback feed | Correct source/site and distinct unconfigured state |

Future private-store/identity/job/Vercel credentials should be selected and named in the implementation environment contract. No fake env names or empty placeholders should be mistaken for configured services. Preview/test environments must avoid production write credentials unless specifically required and safely scoped.

## Decision register

| ID | Decision | Recommended starting position | Needed before |
| --- | --- | --- | --- |
| D01 | Shared site pages versus personal microsites | Shared pages; page grants later | Schema/permissions finalize |
| D02 | Editing freedom | Approved sections/variants first | E03 acceptance and design scope |
| D03 | Draft DB/object/job providers and budget | Private transactional records + private objects + durable jobs | E04 provisioning |
| D04 | Staff identity and role policy | Individual actors; contributor/publisher/admin | E05 production permissions |
| D05 | First public pilot route | About after local copied-About proof | E12 |
| D06 | Global Settings publication scope | Default published settings; include selected global draft explicitly | E09 review workflow |
| D07 | Stable redesign components/tokens | Designer supplies registry variants/tokens | Broader component rollout |
| D08 | Backup/retention targets | Provisional hourly authoring recovery / 90-day release metadata | Provider contract/operations |
| D09 | New page creation/SEO/domain policy | Existing registered routes only in pilot | General page creation |
| D10 | Mobile authoring support | Content editing/save/preview; validate design tools in proof | G1 product acceptance |

These are open choices, not blockers to producing this documentation or starting a fixture-only proof. Provider purchases, account changes and production writes remain future scoped actions.

## Risk register

| ID | Risk | Mitigation / evidence gate |
| --- | --- | --- |
| K01 | Two writers overwrite one canonical field | Unified gateway and shared-resource concurrency tests, G2/G3 |
| K02 | Public Git drafts/assets mistaken for private | Private authoring storage, migration warning and no silent fallback |
| K03 | Static route shadowing | Exact route inventory/twin test and one render owner |
| K04 | About content/unknown metadata lost | Lossless adapter fixtures; stable IDs and original backup |
| K05 | Preview differs from live renderer | Shared renderer, exact snapshot/hash and responsive parity |
| K06 | Runtime event integration unavailable | Restore configuration/access; distinguish outage from empty data |
| K07 | Debug mode bypasses Publish filter | Source hardening ticket E14; isolated negative tests |
| K08 | Commit succeeds but UI reports failure/retries duplicate | Prepared commit persistence and reconciliation/idempotency |
| K09 | Shared login falsely presented as individual audit | Named identity migration before per-user claims |
| K10 | Hosting management access absent | Correct team/project grant; truthful degraded state |
| K11 | Restoring content erases newer code/other pages | New scoped commit against current main and restore drill |
| K12 | Upstream extraction requires full platform or license uncertainty | Narrow pinned reuse, provenance inventory and G1 go/no-go |

## Readiness verdict

**Ready:** bounded local proof and contract review. **Not yet verified:** private authoring infrastructure, named staff roles, full browser editor behavior, live Airtable configuration, Vercel management access and production publication/restore. The backlog provides the path to verify those in order; this package does not promise that no regression is possible.

