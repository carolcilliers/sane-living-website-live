# Verification matrix and release gates

No new editor functionality is implemented. Tests listed as required below are future work, not passing results. Current measured checks are recorded separately in [readiness](11_READINESS_AND_OPEN_DECISIONS.md).

## Gates

| Gate | Required evidence | Blocks |
| --- | --- | --- |
| G0 — baseline | Fresh main SHA, route/content inventory, current build/content tests and known failures classified | Any implementation assumptions based on stale source |
| G1 — core proof | Local editor extraction, schema/adapters, editing/keyboard/undo, preview/static parity and CSS isolation | Selecting OpenPage core as final / backend expansion |
| G2 — authoring | Private provider and identity configured in isolated environment; conditional saves/assets/access/recovery verified | Real shared private drafts |
| G3 — publication | Complete snapshot/commit, race/timeout recovery, exact deployment correlation and restore drill | Production editor publication |
| G4 — pilot | One route migrated; all affected legacy sections/integrations/SEO pass; staff tasks succeed | Wider route rollout |
| G5 — expansion | Per-route matrix complete and compatible component migrations tested | Each next route cutover |

Passing one gate does not waive later gates. Storage, account and runtime permissions are evidence requirements, not assumptions a coding agent can mark complete from a README.

## Required test cases

| ID | Scenario | Expected evidence |
| --- | --- | --- |
| C01 | Envelope/component schema, extra properties, future versions | Invalid shape/type/version blocked with field paths |
| C02 | Unsafe URLs, CSS values, script/HTML payloads and forbidden binding paths | No executable output or prototype pollution; server rejects |
| C03 | Duplicate IDs, cycle, invalid slot, total node/depth/size limits | Semantic validator rejects; useful recovery remains |
| C04 | About hidden fields/extra metadata/suffix/philosophy | Read-edit-write preserves all untouched content |
| C05 | Stable IDs under heading change/reorder/repeated migration | IDs unchanged, no duplicate migration |
| C06 | Cleared Settings/collection values | No accidental fallback to stale values or lost list |
| U01 | Add/edit/duplicate/remove/reorder sections | Correct content, selection and undo transaction grouping |
| U02 | Keyboard-only workflow and focus after mutation | Equivalent actions, labels and announcements |
| U03 | 375/768/1024/1440, zoom, long content, reduced motion | Readable fields, no unreachable actions or page overflow |
| U04 | Editor CSS/shortcuts when other dashboard sections active | Existing pages and text inputs unaffected |
| R01 | Edit during in-flight save | Earlier response acknowledges only its snapshot; newer edits dirty |
| R02 | Offline/refresh/storage failure | Recovery scope truthful; no fake shared-save state |
| R03 | Two browsers editing same draft | One stale save rejected; both versions recoverable |
| R04 | Form editor and visual editor modify same resource | Shared gateway prevents lost update |
| R05 | Manual Git writer changes source while draft open | Conflict identified before release; no silent overwrite |
| R06 | Settings dependency changes after preview | Stale preview rejected or re-reviewed; exact selected scope |
| A01 | Contributor requests another page/global write/publish | Server authorization rejects even with modified browser |
| A02 | Session expiry, CSRF, revoked actor, shared-device recovery | No unauthorized access/write, work safely retained |
| A03 | Asset extension/signature/hash/dimension mismatch and missing object | Finalization/publication blocked; no public leak |
| A04 | Signed preview/media expiry and unauthorized enumeration | No private body served; no sensitive cache/logging |
| P01 | One release with page, About, selected settings and media | One Git ref advancement, all references valid |
| P02 | Main advances between validation and ref update | Non-force refusal, bounded revalidation or explicit conflict |
| P03 | Git accepts update but response lost | Reconciler finds prepared commit/ancestor; no duplicate release |
| P04 | DB fails after Git success | Recover release state from Git evidence |
| P05 | Worker lease expires/retries overlap | No competing accepted ref write or stale job update |
| P06 | Build fails, webhook missed/replayed/out of order | Persistent correct stage; polling recovers; no false live |
| P07 | Production alias stale, protected HTML, unexpected redirect | Remains unverified; exact page marker required |
| P08 | Newer unrelated commit or newer conflicting page release | Live-preserved versus superseded distinguished |
| P09 | Cleanup failure with newer draft present | Live release retained; newer draft untouched |
| P10 | Restore old content after unrelated code/page edits | Scoped new commit preserves newer unrelated work/assets |
| I01 | Airtable upcoming/past, Public override fields, Publish filter | Same record/source semantics and timezone behavior |
| I02 | Missing Airtable credentials / read-only fallback | Honest error/read-only state; no empty-success feed |
| I03 | Public debug modes with fixture unpublished records | Unauthenticated requests cannot reveal raw/unpublished records after hardening ticket |
| I04 | Contact/rental/availability/map/video/newsletter | Configured real destinations preserved; preview inert |
| I05 | Gallery per-photo draft and global publish | Draft photos stay unpublished until explicitly selected |
| S01 | All current rewrite/redirect destinations | No directory shadow twins, no guessed filename routes |
| S02 | Static SEO/favicon and real canonical route | Crawlers receive metadata without editor/client JS |
| S03 | Legacy and new build render ownership | Exactly one body renderer per route; idempotent output |
| S04 | Public bundle network/build inspection | No editor payload, private draft URLs, tokens or Play CDN in public pages |

## Test environments

1. Pure fixtures for schema/adapters/render functions and migration tests.
2. In-memory Git/private-store/Airtable adapters for failures and races; simulate ambiguous success, not only clean errors.
3. Local browser harness serving built `public` plus explicit fake APIs. Existing test server is a useful starting point.
4. Isolated integration environment using an explicitly selected test repository/storage namespace and approved provider test records. No creation is authorized by this documentation task.
5. Controlled production pilot with read-only smoke checks and an agreed restoration point; live writes only through the authorized release process.

Current `npm test` includes `content-api`, `studio-flow` and `studio-settings`. Preserve these assertions while adding focused tests. Existing event UI tests simulate Airtable; they are not proof of live Airtable credentials. Browser install and actual production build tooling must be available before claiming end-to-end results.

## Evidence report format

Every gate report records baseline/head SHA, scope, exact commands, environment/fixture identity, pass/fail counts, screenshots when useful, before/after content/route hashes, unresolved failures and reproduction steps. Do not ship screenshots containing private draft or personal data in public Git documentation. Never mark an item passed because a test is merely named in the backlog.

## Release stop conditions

Stop the affected release on unauthorized source access, unverified rollback, missing canonical source, unknown component version, unsafe embed/URL, route collision, failed required integration, render divergence, unresolved concurrency failure, leaked private asset reference or deployment/content mismatch. Keep the public legacy route serving while resolving the issue. A cosmetic difference explicitly approved by the redesign is not automatically a regression; lost content/functionality is.

