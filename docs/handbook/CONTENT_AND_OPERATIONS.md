# Content, media and backend operations

## Native save contract

GET `/api/dash-content?section=<key>` returns published content/SHA and an optional shared draft with draft SHA and base SHA. Valid keys come from `api/_contentlib.js`; event stories use `eventStories`. Reads are authenticated and private/no-store.

POST `/api/dash-save` receives `{path, action, content, expectedSha, expectedDraftSha}`. Action is draft, publish or discard. Content is serialized text. Both expected versions are mandatory. A 409 means someone changed published/shared content; keep work and present the conflict. Never retry by replacing a version with the latest SHA while retaining an unreviewed old snapshot. Failed loads cannot become blank publishable data.

Saving a shared draft writes outside public/. Native localStorage recovery is immediate device protection; it is not an autosaved team commit. Edits made while a save is in flight remain unsaved after that snapshot completes. Save and Publish are distinct. Revert explicitly discards the working/shared draft, with a device backup when storage allows.

Event-story publish is special: validate all records, select `published:true` records for the public payload, then retain the entire working library as a shared draft based on the new published SHA if unapproved stories remain. The response includes `publishedContent` and `retainedDraft`; the client must use these, rather than assuming its full snapshot became public. If retaining the draft conflicts after publication, the API reports accepted publication plus a warning, and the client keeps device recovery and blocks blind saves. Git/Airtable are separate systems; do not imply an atomic transaction across them.

## Media contract

Authenticated upload uses `/api/dash-save` with `{path,contentBase64}` and a unique, safe filename. Existing filenames cannot be overwritten.

- Images: public/images/<filename>.png/jpg/jpeg/webp/gif/ico; maximum server size 4 MB; signature must match extension. Existing gallery compression reduces upload sizes. SVG/HTML/script uploads are not accepted.
- Short video: public/media/<filename>.mp4/webm, maximum 3 MB to fit the serverless request envelope; MP4 ftyp / WebM EBML signature checks. Use a hosted Vimeo/YouTube/HTTPS video URL for larger recordings. Do not store large films as GitHub blobs or claim an external video upload service is installed.
- Upload stages an asset. Select it in its content field, Save draft and explicitly Publish the referencing section when ready. Production placement waits for deployment. Event authoring uses an in-memory blob copy for immediate preview; saved data always contains the actual asset path, never a blob URL.
- Removing a photo/video reference from a story is not a repository asset delete. Do not delete originals that another page or an unpublished draft may still use.

## Content and security rules

No raw HTML, iframe snippets, script URLs or credentials in event fields. `public/event-model.js` supplies shared IDs, URL/date checks, media limits and publication guards. Embeds accept supported Vimeo/YouTube forms; direct clips use native controls. Plain text is escaped in authoring previews and inserted with textContent in public adapters.

Shared drafts are excluded from the deployed public directory, but this repository is public. Do not use GitHub content or drafts for secrets, confidential guest lists, private booking/payment notes or sensitive client data. Wedding publication requires recorded permission for public details and media.

Airtable's staff API has no-store responses, validates dates/times/URLs/IDs and includes a field snapshot version. PATCH/DELETE can reject known stale versions. Airtable does not provide this code an atomic compare-and-swap write: the read/check/write window remains a limitation. GitHub content SHA protection is the stronger file-level guard. Public override fields can control displayed values; conflicting edits are blocked with a precise explanation rather than silently saving a base field that the website ignores.

Public calendar debug modes require staff login, retain no-store headers and never expose unpublished records anonymously. Standard feeds retain the Publish filter, Los Angeles date boundary, pagination and existing five-minute CDN behavior. Never change calendar keys/table or disable the publish filter merely to make an empty feed show data.
