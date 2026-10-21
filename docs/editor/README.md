# Sane Living editor — development handoff

**Current implementation:** see [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). The About editor is integrated with a current-site canvas and an explicit handoff to existing About review/publishing. New private editor storage and verified releases remain gated. The planning snapshot below is retained for context.

Version 1.0 • October 20, 2026, America/Los_Angeles • Documentation and design contracts only

## Start here

This package turns the repository assessment into a staged engineering plan. It is sufficient to start an isolated technical proof with clear inputs, deliverables and stop conditions. It is **not** a declaration that production infrastructure is configured or that an editor has been implemented.

Target: `carolcilliers/sane-living-website-live`, `main`, baseline `3e020ae628ae609345d3906a5d8180d293fd05ff`.

The intended workflow is: select a page → edit approved sections → save a private draft → preview the selected snapshot → review its scope → publish one content commit → track Vercel → verify live content → retain a reversible release record.

## Reading order

| Document | Use |
| --- | --- |
| [01_CURRENT_SYSTEM.md](01_CURRENT_SYSTEM.md) | Current files, data owners, routes and integration boundaries |
| [02_ARCHITECTURE_AND_DECISIONS.md](02_ARCHITECTURE_AND_DECISIONS.md) | Target modules, design decisions and dependency rules |
| [03_CONTENT_AND_COMPONENT_CONTRACT.md](03_CONTENT_AND_COMPONENT_CONTRACT.md) | Page model, bindings, component rules and schema evolution |
| [04_API_AND_STORAGE_CONTRACT.md](04_API_AND_STORAGE_CONTRACT.md) | Proposed endpoints, private records, revisions, permissions and errors |
| [05_PUBLICATION_PROTOCOL.md](05_PUBLICATION_PROTOCOL.md) | Atomic Git publication, retries, deployment status and audit semantics |
| [06_EDITOR_UX_AND_REDESIGN.md](06_EDITOR_UX_AND_REDESIGN.md) | User workflow, canvas behavior and frontend redesign contract |
| [07_MIGRATION_AND_ROLLBACK.md](07_MIGRATION_AND_ROLLBACK.md) | About pilot, staged cutover, legacy writers and safe restoration |
| [08_VERIFICATION_AND_RELEASE_GATES.md](08_VERIFICATION_AND_RELEASE_GATES.md) | Required evidence, regression matrix and go/no-go gates |
| [09_IMPLEMENTATION_BACKLOG.md](09_IMPLEMENTATION_BACKLOG.md) | Dependency-ordered work packages with acceptance criteria |
| [10_PILOT_DEVELOPER_GUIDE.md](10_PILOT_DEVELOPER_GUIDE.md) | Exact next development slice and handoff instructions |
| [11_READINESS_AND_OPEN_DECISIONS.md](11_READINESS_AND_OPEN_DECISIONS.md) | Measured readiness, blockers, assumptions and owner decisions |
| [12_REUSE_AND_SOURCE_REGISTER.md](12_REUSE_AND_SOURCE_REGISTER.md) | Upstream reuse boundaries, licenses and evidence links |
| [13_TEAM_WORKFLOW_GUIDE.md](13_TEAM_WORKFLOW_GUIDE.md) | Proposed staff-facing save/preview/publish guide |
| [reference/INITIAL_REPOSITORY_ASSESSMENT.md](reference/INITIAL_REPOSITORY_ASSESSMENT.md) | Earlier detailed comparison of all five repositories |
| [inventories/PAGES.md](inventories/PAGES.md) | All current public page destinations and migration classification |
| [inventories/SETTINGS_FIELDS.md](inventories/SETTINGS_FIELDS.md) | Exact current settings keys and binding ownership |
| [schemas/page-document.schema.json](schemas/page-document.schema.json) | Draft v1 structural contract, not installed in the application |
| [examples/about-layout.example.json](examples/about-layout.example.json) | Synthetic pilot layout with an About content binding |

## Scope and status

| Item | Status |
| --- | --- |
| Current source baseline | Refreshed and pinned; 65 relevant text files retrieved |
| Five-repository assessment | Completed previously; preserved in reference document |
| Editor core | OpenPage-derived subset proposed; extraction proof required |
| Private draft/database provider | Capability requirements specified; provider not chosen/provisioned |
| Individual staff identities | Required for named roles/page ownership; migration not implemented |
| GitHub publishing | Existing content API works in isolated tests; new multi-file publisher is proposed |
| Vercel management access | Blocked by missing grant to `carol-cilliers`; exact result in readiness document |
| Airtable public feed on current deployment | HTTP 500 configuration missing; exact missing variable cannot be inferred |
| Browser editor usability/parity | Future acceptance work; no new editor exists yet |

## Non-negotiable integration rules

1. Preserve current routes, redirects, event sources and staff editing while introducing a separately gated editor.
2. One source owns each content field. Both form and visual interfaces must use its adapter and revision checks.
3. Private drafts and staged media never enter the public repository or `public/` in the target production architecture.
4. Keep secrets server-side. This chat's GitHub connection is not the dashboard's runtime credential.
5. Write releases directly to `main`, no branches/PRs, unless the owner later changes that workflow. Do not push documentation or application changes merely because this package exists.
6. Never replace a failed/missing load with an empty editable page. Block publication and preserve recovery.
7. Build rendering must have one route owner. Do not create `public/<route>/index.html` twins beside rewrite-driven `.html` pages.
8. A saved draft, accepted commit, completed build and verified live release are distinct states.
9. Unknown component versions, unsafe bindings and invalid routes block publication.
10. No “no regressions” claim without the evidence required by the gate being passed.

## Immediate next slice

Implement only backlog packages **E01–E03** initially: create an isolated proof harness, validate the contract and adapters with a copy of About, and demonstrate rendering parity plus basic editing. Use local fixtures; no production credentials, private-service provisioning, Git writes or Airtable writes. Keep the public renderer in legacy mode.

When that proof is complete, report measured extraction effort, test evidence, unresolved gaps and a revised estimate. Then select the provider/identity implementation and authorize the backend/publication stages. The ordered backlog explains which work is independent of these decisions.

## Package boundaries

This package contains Markdown guides, a schema, synthetic examples and source-derived inventories. It contains no production credentials, copied upstream applications or executable website implementation. The JSON Schema is a proposed structural specification; semantic validation and API authentication are separately specified. Current-source observations are distinguished from proposed behavior throughout.

