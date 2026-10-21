# Dependency-ordered implementation backlog

These are scoped work packages, not completed tasks. All application paths are proposed unless identified as existing. Use the current repository conventions and direct-main workflow only when implementation/publication is authorized; this handoff itself does not push changes.

## Critical path

E00 → E01 → E02 → E03 → core decision → E04/E05/E06 → E07/E08 → E09 → E10 → E11 → E12.

E13 and E14 are pre-release compatibility/hardening work. E15 is broader rollout after the pilot. Storage/identity choices do not block local E01–E03.

| ID | Work package / likely touchpoints | Dependencies | Acceptance and rollback |
| --- | --- | --- | --- |
| E00 | Refresh baseline, source hashes, route map, known-failure report; `docs/editor/` | None | Current head recorded; all source drift reviewed. No site change |
| E01 | Isolated editor build/harness; `editor/`, dedicated proof script, scoped CSS | E00 | Opens local synthetic sample, no runtime credentials/network writes; old dashboard unchanged. Remove proof bundle/flag to revert |
| E02 | Page/runtime contracts, registry interface and About adapter; `content-core/`, fixture tests | E01 | Schema + semantic validation, stable IDs, no content loss, bound field ownership. Original content untouched |
| E03 | OpenPage slice extraction, shared render proof, UI interactions; `editor/`, `content-renderer/` | E02 | G1 evidence: selection/edit/reorder/keyboard/undo, parity at 4 widths, style isolation. Accept/reject core explicitly |
| E04 | Provider capability proof and backup/restore design; server storage ports | Core decision + owner provider/budget choice | Conditional revisions, transactions, private objects and durable jobs demonstrated in isolated namespace. No public fallback |
| E05 | Individual identity/grants/session migration; `api/_studio/identity*` and staff onboarding docs | Owner role/identity choice | Actor/page/server-role tests, revoke/recover access, shared-device behavior. Existing login remains until planned cutover |
| E06 | Private draft API/recovery/client state; proposed studio endpoints | E02, E04, E05 | G2 draft tests including 2 browsers, typing during save, expiry and conflict. Disable draft flag to revert |
| E07 | Private asset upload/finalization/promotion manifest; storage/API/media UI | E04–E06 | Signature/hash/size/dimension checks; private staging; immutable public mapping; no premature deletion |
| E08 | Route/render ownership + exact snapshot build/preview; manifest, `scripts/build-content.cjs`, new build orchestrator | E03, E06 | Only selected page renderer writes body; real iframe preview; metadata preserved; no route twins; original public owner still legacy |
| E09 | Git multi-file publisher/job leases/idempotency, existing save gateway delegation | E06–E08 | P01–P05 and R04/R05 tests; one commit, non-force update, race recovery; no arbitrary paths. Publication flag off by default |
| E10 | Vercel status/marker/live verification and reconciliation | E09 + correct runtime team grant | P06–P09 tests including missed events/protected HTML/alias mismatch; safe degraded status. No false live state |
| E11 | Scoped restore and incident drill; release history/UI/runbook | E09–E10 | P10 passes while preserving unrelated code/page changes; old asset versions available. No hard reset |
| E12 | About pilot cutover and staff usability | E11 + G2/G3 + E13/E14 | G4 passes, one existing route live verified, original sources retained and restore demonstrated |
| E13 | Legacy writer/documentation compatibility audit; auth/callback/admin references, dashboard guards, CLAUDE docs | E00, gateway design | Confirm no browser token handoff; old form path delegates or clearly reloads; stale docs corrected in implementation change |
| E14 | Public calendar debug/filter hardening and infrastructure regression evidence | E00 + Airtable test fixtures | Ordinary published feeds preserved; unauthorized debug cannot bypass filter; credentials/config checked without exposing values |
| E15 | More components/routes in inventory order; redirect/SEO/new-page support | G4, per-route G5 | Route-specific acceptance; no bulk cutover; re-estimated scope |

## E01–E03 deliverable breakdown

E01 introduces a separate development entrypoint and a synthetic fixture. Do not refactor staff event handling or add auth/database providers. Verify exact output root/API mocks; current `npm run dev` is not production-equivalent.

E02 implements structural + component + binding validation and a copied About fixture. Keep canonical Markdown/frontmatter untouched in the live source. Design stable section IDs with lossless preservation tests before writing a migration. New rich-text UI selection is a proof decision; unsupported Markdown must survive.

E03 extracts only the smallest useful layer/property/selection logic. Replace upstream project state with a Sane Living model adapter. No OpenPage deploy endpoint, AI orchestration, local project database or generic mock-success forms. Produce shared preview/static output and a comparison report. If core extraction fails the gate, stop expansion and recommend a UI adapter replacement while retaining the model.

## Package completion definition

Each work package includes: problem/outcome, files changed, contract impact, targeted tests/evidence, migration compatibility, rollback action, remaining gaps and next dependency. A disabled feature flag is not proof that its backend is safe when enabled. A successful compile is not proof that publication or a real integration works.

## Scope discipline

Do not combine the initial editor proof with a homepage redesign, new payment/calendar system, arbitrary HTML importer, multitenancy, domain provisioning, AI generation or real-time collaboration. Those may be useful later but would obscure whether the editor foundation actually works.

Avoid broad legacy refactors solely for style. Touch existing APIs when needed for a documented ownership/concurrency requirement, and retain behavior through adapters/tests. Keep future implementation commits small enough to review and restore, while making each accepted content release atomic for its selected resources.

## Estimates

The previous assessment suggested roughly 13–22 working days for core proof, backend, publishing and a first page, plus planning and wider migration. Treat that as low-confidence until E03 and concrete identity/storage choices are complete. This backlog adds explicit hardening, operational recovery and staff verification; re-estimate after the proof rather than promising the original range regardless of findings.

