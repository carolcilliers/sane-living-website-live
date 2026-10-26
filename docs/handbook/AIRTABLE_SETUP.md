# Airtable readiness and connection handoff

The dashboard can prepare, share and recover planning drafts before Airtable is connected. Its real calendar remains read-only/unavailable until server credentials are installed. This release does not manufacture a successful connection.

## Required setup

Set server-side `AIRTABLE_API_TOKEN` and `AIRTABLE_BASE_ID` in the correct Vercel environment; optional `AIRTABLE_CALENDAR_TABLE` defaults to `tblIqFjxxfbOgwuQu`. The token needs record read/write access to that base/table. Never put it in public JS or Git. Production variables do not automatically exist in previews. Redeploy after configuration.

Expected writable base fields: Title, Start Time, End Time, Location, Description, Type, Price, RSVP Link, Publish. Date/time values are stored as UTC ISO instants and displayed in America/Los_Angeles. Start/end time fields must accept dates; Publish is a checkbox. Select options must be compatible with typecast writes. The staff mapper also reads existing Public * overrides, Name/Date and RSVP URL fallbacks; image attachments are read without a schema migration.

Public Title/Location/Description/Type/Price/RSVP Link overrides can shadow base fields. The API refuses a conflicting base edit when an active override controls that value. Resolve the override in Airtable after checking whether the column is a formula/lookup or editable. Do not blindly write computed columns; Airtable documents that computed fields cannot be edited directly. Verify Public Start/End Time overrides as part of setup as well. No token with schema-administration permission is assumed or requested by the code.

## Connection acceptance procedure

1. GET the authenticated `/api/dash-events`. Confirm connected true, expected title/date/time, unpublished visibility and older records across pagination. Compare the actual base/table.
2. Use an approved test record, create it unpublished, reload, edit it and verify exact returned values. Check Los Angeles display around date/time boundaries. Confirm empty End Time clears rather than retaining an old value.
3. Deliberately publish/unpublish that authorized test record. Compare the public upcoming/past feed after its CDN cache interval. Verify only Publish=true records appear publicly.
4. Create a planning story in the dashboard. With valid title/date/start time, Create unpublished Airtable entry links the returned record id into its shared draft. Check that link before repeating creation.
5. Approve and publish its story details separately; verify poster, host text, gallery and recordings in the existing event modal. Keep the calendar's Publish checkbox deliberate. Wedding stories additionally require consent.
6. Test a second editor changing the same source. Known stale versions must preserve the first editor's work and reject overwrite. Document Airtable's non-atomic read/check/write limitation.
7. Remove only the authorized test content and verify the final public listing. Never run write acceptance tests against real client events without authorization.

A lost response to a create request is ambiguous: the record may exist. Reload and inspect Airtable/calendar before retrying; there is no durable exactly-once cross-service worker installed. An accepted Git commit also does not mean Vercel/CDN is current. These are distinct statuses.

Official references reviewed: Airtable's getting-started Web API guide (offset/pageSize), field/table permissions (computed fields), and API troubleshooting (attachment URL fetches). Current documentation: https://support.airtable.com/docs/getting-started-with-airtables-web-api and https://support.airtable.com/docs/airtable-field-and-table-editing-permissions .
