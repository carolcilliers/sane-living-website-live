# Element editing, responsive layouts and private recovery

This extends the implemented contract in [14_WEBSITE_STUDIO_GUIDE.md](14_WEBSITE_STUDIO_GUIDE.md). The original ownership boundaries, trusted-template guard, single atomic publish and direct-main workflow remain authoritative. No application code from the inspiration repositories is merged into the runtime.

## Editing contract

| Operation | Behaviour |
| --- | --- |
| Click an original element | Select its source descriptor and open its editable content/bindings and design inspector. |
| Click an added block | Open its typed content controls and responsive design inspector. Added blocks are structured components; their internal generated markup is not an arbitrary DOM editor. |
| Size | Percentage width, pixel height/minimum height, aspect ratio, image fit, pointer resize for original elements. |
| Typography | Font size, weight, line height, alignment, text colour. |
| Surface | Background, opacity, corners, border colour/width. |
| Layout | Normal flow, flex rows/columns, grid columns, distribution, alignment, gap, padding, margin and pointer offsets. |
| Device scope | Desktop/laptop above 1024px; tablet 601–1024px; phone through 600px. Explicit styling belongs only to the selected scope. |
| Shared content | Text, image URLs, bindings, additions/removals and structural layer order remain shared. Use **Hide on [device]** to change only that size's visibility. |
| Optimize | An undoable preset for the selected element/block and device; it resets offsets/width and, for supported original containers on smaller sizes, chooses a vertical flow. It does not redesign every page. |
| Insertion | Visible section boundary lines select an exact insertion point. Native drops can target a line, an original container or a row/column. Palette clicks use that selection instead of always appending. |
| Nested layout | New Row and Column blocks contain approved blocks. Duplicating/removing a container includes its descendants. Validation rejects cycles and depth above ten. |
| Existing integrations | Source elements move within their original section. Whole original sections move between section lines. Managed content retains its canonical editor and original script identifiers. |

`content-core/design.cjs` is the shared whitelist and CSS generator. Layouts retain version 2 and add optional `responsive` maps on source-element overrides and blocks, plus optional block `design`. Old layouts without these fields remain supported. CSS is generated from fixed property names, enumerated values, bounded integers and six-digit colours; arbitrary CSS, HTML and JavaScript remain excluded. Responsive media queries are exclusive, so desktop overrides do not leak into phone styles. The original template remains the fallback when an override is cleared.

Source descriptors and generated row/column references are validated before publication. The browser also validates structural moves before applying them. Undo/redo includes device overrides and nested structure. The layer view follows effective source-element parents/order and indents nested blocks.

## Preview

Preview creates an immutable same-browser IndexedDB snapshot before navigating a new tab. If the browser blocks the popup, the editor opens that same snapshot inside a large dashboard overlay. Its explicit **Open preview in new tab** link provides another user-initiated opening method. Closing the fallback returns to the intact editor.

Authentication, snapshot schema validation and transaction guards are retained. Preview does not publish, submit forms or perform booking transactions. It is not a public share link or a cross-device preview service. Browser/security failures still produce actionable recovery messages; the application cannot disable browser security policies.

## Browser recovery

- Autosave runs after 800 ms without edits and flushes on visibility/page-hide and dashboard navigation where the browser permits it.
- Saves use one strict-durability IndexedDB transaction with revision comparison. Edits made during a save cause a follow-up save; the status cannot claim that newer unsaved work is saved.
- The last ten previous saves are retained transactionally. **Recovery history** can download or restore them. Restore creates an undoable working change; it never publishes.
- Source conflicts do not stop private autosave. Their original source baseline is retained across save, refresh, export and team backup, so recovery cannot accidentally clear a publication conflict.
- Storage failures pause automatic retries, preserve in-memory work and offer explicit Save/Download. Another tab's revision conflict blocks replacement. Download/import remains available.
- The browser is asked for persistent storage where supported. That request is not a storage guarantee. Clearing browser data, logout or device loss can remove local copies; use private team backups for cross-browser recovery.

## Private shared drafts: optional server connection

`GET/POST /api/studio-draft` uses the existing signed staff session. POST additionally enforces the dashboard origin. It stores no drafts or draft media in the public GitHub repository and creates no deployments.

The hosting owner must provision an Upstash-compatible **private Redis REST** database and set these server-only variables on the intended Vercel project/environment:

```
STUDIO_DRAFT_REDIS_REST_URL
STUDIO_DRAFT_REDIS_REST_TOKEN
```

Use an HTTPS endpoint and a write-capable token, never `VITE_` variables or committed values. The current connection cannot configure Carol's Vercel team. Until configured and verified there, cross-device backup is **not active**. An authenticated GET returns `{configured:false,record:null}` and the editor explicitly stays browser-only.

With configuration enabled:

1. The editor reads the shared team draft. With no local recovery it can adopt a compatible team draft and save it locally.
2. A different existing local draft is retained and team sync pauses for explicit review. The current local copy is downloaded before replacing it with a different team draft.
3. After a successful local save and a two-second quiet interval, the editor posts the private workspace, original source baseline, expected team revision and a unique save ID.
4. One Redis Lua operation compares revisions, retains the previous ten versions and writes the next value atomically. Conflicting authors cannot silently overwrite each other's team draft. Reused save IDs with different payloads reject; identical retries are idempotent.
5. Offline/failing storage leaves browser autosave intact and reports that team backup failed. Reconnect reads the actual remote version before continuing. Object-key ordering from Redis serialization does not create false conflicts.

Server validation bounds project schema, settings, About content, revision/save identifiers, staged image references/counts and payload size. Credentials stay server-side; error responses do not expose provider errors or tokens. The current record has no automatic expiry. Recovery reads use `GET /api/studio-draft?previous=0` through `9`, one bounded previous record per request. Storage retention/cost and provider backup policies remain the hosting owner's responsibility.

This is one shared team workspace under the existing staff login, not live collaborative editing, per-person permissions, or automatic conflict merging. Cross-device previews, user roles and a durable deployment/rollback worker remain separate architecture stages.

## Verification and rollout

Run `npm run typecheck`, `npm test`, `npm run build`. The suite includes all previous dashboard/content/publisher regressions and additional model/browser flows for:

- Device isolation in rendered CSS, exact insertion, row/column nesting, container duplication/removal/undo and style injection/cycle rejection.
- Popup-blocked preview fallback with visible immutable draft content and zero publishing commits.
- Autosave history/refresh, quota errors, tab conflicts and preservation of stale source baselines.
- Server private-draft authentication/origin/validation, REST request contract, idempotency, revision conflicts and offline errors.
- Two isolated browser contexts recovering a team draft, stable serialization comparisons and conflicting edits retaining both versions.

Redis tests use an isolated REST contract fixture, not a production database. Local publishing tests use real handlers against isolated Git fixtures. Neither proves a live deployment, production staff authentication, actual provider durability or real calendar/form transactions.

Before team rollout: deploy the committed code; verify the served editor bundle; check staff login and harmless private preview/save; configure private storage if cross-device recovery is required; test a real backup and recovery from a separate browser; verify conflict behaviour; then perform a reviewed publish and observe its deployed release marker. Do not call the production workflow ready before these checks.
