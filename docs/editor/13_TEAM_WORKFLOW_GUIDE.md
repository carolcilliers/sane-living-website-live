# Proposed team workflow guide

Future guide draft. The Page editor described here has not been implemented yet. Existing dashboard features remain the current workflow.

## Edit a page

Open Page editor and choose the page you want to change. Select a section on the page or in Layers. Edit its text, photo, links or approved layout in the side panel. Move a section with its drag handle or Move up/down buttons. Undo can restore an accidental edit while you are working.

Fields labeled global affect more than one page. Logo, contact information and booking destinations use Settings. Events and collection lists keep their dedicated dashboard sections. The editor should take you to the correct source instead of asking you to maintain two copies.

## Save and preview

Save draft stores the selected revision for the team without publishing it. Wait for Draft saved before assuming another device can open it. Saved on this device means recovery only. If a save fails, keep the page open when possible and use the recovery/export option; the interface must not claim a failed save succeeded.

Preview shows the selected saved snapshot at different screen widths. Test text length, images, links and mobile arrangement. Preview forms and booking controls do not make real submissions. Editing after opening Preview makes that preview out of date.

## Publish

Publish opens a review of the page and any explicitly included global changes. Check the affected pages and validation messages. Publishing uses that reviewed snapshot; later edits stay separate.

The interface shows the progress through GitHub commit, build and live verification. Building means the website is still updating. Live verified means the production page matches the release. A successful save or commit alone does not mean the change is visible yet.

## If someone else changed the page

A conflict protects both versions. Keep your recovery copy, compare the new team revision and load/reapply the changes you still need. Do not repeatedly press Publish to overwrite it. An administrator can help reconcile shared/global changes.

## Restore a previous version

Release history lists previously published snapshots. Restore creates a new release of the selected content, preserving unrelated later work. It does not erase Git history, reverse submitted inquiries or undo Airtable event edits. Check the selected page/global scope before confirming the normal restore review.

## If publication fails

Read the stage shown. A draft-save failure, GitHub authorization failure, build failure and verification delay need different recovery actions. Keep the job/release ID when asking for help. Never share a password or provider token in chat, page content or a screenshot.

