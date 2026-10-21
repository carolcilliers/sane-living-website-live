# Proposed authoring API and private storage

Status: proposed behavior; endpoints below do not exist yet. Existing content/event APIs continue until gateway delegation is tested. Prefix and file names can change together before implementation, but semantics must remain consistent.

## Cross-cutting contract

- Every authoring read/write requires a server-verified session, page/resource authorization and `Cache-Control: private, no-store`.
- Cookie-authenticated mutations require an Origin/CSRF policy. Validate JSON type/size, reject unknown operations, and use structured error envelopes.
- IDs, actor roles, repository, branch, file paths, output destinations and allowed component versions are server-owned.
- Request/response bodies never contain repository tokens, Vercel keys, provider secrets or arbitrary external fetch destinations.
- Use opaque draft revisions, separate published file/content hashes, and explicit selected dependency revisions. Do not compare only timestamps.
- Use `If-Match`/ETag semantics for conditional draft updates; a missing precondition is an error, including for older client bundles. Define create-only draft behavior using `If-None-Match: *`.

## Endpoint plan

| Endpoint | Request / behavior | Success |
| --- | --- | --- |
| `GET /api/studio-session` | Actor ID/display role, allowed page IDs, enabled features; no secrets | 200 capabilities |
| `GET /api/studio-pages` | Authorized page list; no private content from unauthorized pages | 200 summaries |
| `GET /api/studio-page?id=...` | Published baseline and current shared draft/resource revisions | 200 with opaque ETag |
| `PUT /api/studio-draft?id=...` | Full validated document/projections, expected revisions; conditional write | 200 new revision, stored hash/time, author |
| `POST /api/studio-preview` | Select exact immutable page/dependency revisions | 201 preview ID/expiry or 202 render job |
| `GET /api/studio-preview?id=...` | Authorized rendered snapshot/status; no raw external script input | 200 or 202 |
| `POST /api/studio-assets` | Request private upload with declared type/bytes/hash and resource scope | 201 upload intent; signed URL only if provider requires it |
| `POST /api/studio-asset-complete` | Finalize intent; verify bytes/hash/signature/decoded dimensions server-side | 200 asset ID and private metadata |
| `POST /api/studio-publish` | Reviewed revision set, preview snapshot hash and idempotency key | 202 existing/new durable job ID |
| `GET /api/studio-publication?id=...` | Authorized job state, safe errors, commit/deployment/live evidence | 200 |
| `GET /api/studio-releases?pageId=...` | Durable published release history, not undo stack | 200 paginated summaries |
| `POST /api/studio-restore` | Target release/resource scope and current expected baselines | 202 new restoration job; never force ref reset |

No page creation/deletion endpoint is needed for the initial About pilot. Introduce one only after the route-manifest/redirect contract is implemented and owner role is defined. No bulk “publish everything” operation in v1.

## Draft update shape

Normative fields: `pageId`, `document`, `basePublishedRevision`, `selectedResourceRevisions`, `clientMutationId`. The draft ETag is a request precondition; `clientMutationId` deduplicates the same submitted mutation. Sending the same ID with a different body returns an idempotency mismatch, never overwrites.

The response identifies the **stored snapshot**, its new revision and hash, the acknowledged mutation ID and current dependency baseline. The client compares its local mutation sequence: if typing occurred after the submitted snapshot, retain unsaved status and recovery. Do not replace the editor's newer state with the response body.

Malformed or unsafe documents are rejected. Incomplete but structurally safe drafts may be saved with field-level publication warnings. Required CTA targets or missing integrations can block publish without blocking recovery. Unknown component types/versions remain exportable recovery data but cannot become an accepted editable draft unless supported by an explicit compatibility policy.

## Publication request shape

`pageId`, `draftRevision`, `dependencySelection[]`, `expectedPublishedHashes`, `previewSnapshotHash`, `idempotencyKey`.

Each selected dependency has resource ID, exact draft/published revision and intended write scope. Default to currently published global settings. A page release may include a selected Settings draft only after displaying all affected routes and obtaining the normal Publish review action. Do not auto-include a teammate's pending global work.

Server recomputes the snapshot/hash; it never trusts client-supplied generated HTML. It verifies preview/renderer versions match selected revisions. Stale preview or stale dependency returns conflict/review-required, preserving draft. No API allows publishing an arbitrary older local body while claiming the newest revision.

## Proposed private records

| Record | Essential fields / invariants |
| --- | --- |
| Page registry | ID, canonical route, output path, template, render owner, allowed grants; output path not client writable |
| Resource head | Resource ID, current draft revision, published baseline, update actor/time; conditional update |
| Draft revision | Immutable ID, page/resource ID, parent revision, content/hash, base published hash, actor/time, schema/renderer compatibility |
| Asset intent/object | Owner/resource scope, state, verified type/size/hash/dimensions, private storage key, published immutable path, retention refs |
| Preview | ID, immutable snapshot hash, dependency revisions, renderer version, expiry and authorization scope |
| Publication job | Idempotency key/body hash, selected revisions, expected source hashes, state, leases, target commit, attempt history and safe failure |
| Release | ID, commit/parent/tree, affected routes/resources, before/after hashes, component versions, asset refs, deployment/live evidence |
| Audit event | Actor, action, target, revision/job IDs, time, result and correlation ID; no tokens/content bodies |

The provider must support atomic conditional revision changes and durable job deduplication. Multi-resource snapshot creation should be transactional or based on immutable revision IDs that cannot change during selection. Retention of preview/draft/release references determines when staged assets can be removed.

## Error vocabulary

| HTTP | Code | User/client action |
| --- | --- | --- |
| 400 | INVALID_DOCUMENT / INVALID_OPERATION | Highlight field/path; keep local recovery |
| 401 | SESSION_EXPIRED | Reauthenticate, then revalidate baselines before retry |
| 403 | PAGE_FORBIDDEN / ROLE_FORBIDDEN / ORIGIN_REJECTED | Explain denied action; no automatic elevated retry |
| 404 | PAGE_NOT_FOUND / REVISION_NOT_FOUND | Stop editing/publishing; never synthesize blank page |
| 409 | DRAFT_CONFLICT / SOURCE_CONFLICT / PREVIEW_STALE / IDEMPOTENCY_MISMATCH | Preserve local work; load comparison/current revisions |
| 412 | PRECONDITION_FAILED | ETag mismatch; same preservation rule |
| 413 | DOCUMENT_TOO_LARGE / ASSET_TOO_LARGE | Explain configured limit; no silent truncation |
| 422 | PUBLICATION_VALIDATION_FAILED | Safe draft retained; show actionable blockers |
| 428 | PRECONDITION_REQUIRED | Reload versioned client data; no unguarded write |
| 429 | RATE_LIMITED | Bounded retry-after; retain recovery |
| 502 | GITHUB_REJECTED / DEPLOYMENT_PROVIDER_ERROR | Persist job/error stage and returned safe authorization detail |
| 503 | SERVICE_NOT_CONFIGURED / PRIVATE_STORE_UNAVAILABLE | Disable affected action; do not fall back to public draft writes silently |

Envelope fields: `error.code`, `error.message`, `error.fieldErrors[]`, `error.retryable`, `requestId`; conflicts may include authorized current revision IDs/hashes. Redact upstream secrets and prevent HTML error injection. The API may map 409/412 consistently internally, but clients must preserve work for both.

## Concurrency and existing interfaces

During migration, wrap existing `/api/dash-save` operations in the same gateway for resources enabled in the new editor. Maintain old request shape and SHA guards; map them to gateway source revisions. Do not keep the old direct Contents write as a bypass. Gallery per-photo publication, existing Settings saves and About edits must obey the same shared-resource locking/recheck rules.

Manual Git commits remain possible. Recheck main and affected file hashes before publication, and after any bounded rebase attempt. Locks among dashboard workers cannot prevent outside Git writers. Non-force ref updates plus current-head revalidation are the final safeguard.

## Security/retention defaults

Proof uses local fixtures only. Production requires named actors, server-enforced page grants, private preview access and credential revocation. Signed asset/preview links are bearer capabilities: short expiry, correct resource scope, no indexing, no content in query logs, and no inclusion in public output. Deletion must revoke access/clear references before eventual garbage collection.

Provider choice, backup RPO/RTO, draft/release retention and operational budget are open owner decisions. Proposed starting targets are hourly recoverability of authoring data and 90 days of content release metadata, subject to provider capabilities/cost confirmation. They are not existing service guarantees.

