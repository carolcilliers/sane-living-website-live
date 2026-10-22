# Component-specific editing and verification

October 22, 2026. Extends guide 21 within the existing editor, storage and atomic publisher. No upstream application/database/runtime replacement is involved.

## Inspector contract

`content-core/editor-controls.cjs` classifies every approved typed block and trusted source element. Recommended controls match the selection: image crop/focal point, text typography, container grids/flex/spacing, button/link styling, video playback, or embed sizing/borders. Show all design controls exposes the full validated vocabulary. An embed does not advertise controls for typography inside a remote document.

Shared `ComponentControls.tsx` provides image modes, layout arrangements and video controls. All actions edit the existing validated project rather than temporary canvas-only state. Source and typed images use the same sizing presets. Device overrides remain exclusive; text, media URLs, additions and structural order remain shared.

| Selection | Content controls | Appearance / layout |
| --- | --- | --- |
| Text / heading | Existing leaf text and appended inline text segments | Typography, colour, alignment, spacing, borders, states |
| Image | URL, upload, description, existing gallery slides | Natural/crop/card/full-screen, fit/focal point, dimensions, borders/shadow, parent background/parallax |
| Button / link | Label, destination, new-tab option | Typography, sizing, spacing, background, border, shadow, states |
| Section / row / column | Exact-position inserts and layer tree | Stack, horizontal row, 2/3-column grids, advanced grid/flex, backgrounds/media |
| Card / split / callout | Explicit part selector and part-specific fields | Image, heading, text and button have independent validated styles, responsive overrides, states and free movement |
| Video | Source, poster upload, controls/autoplay/loop/mute | Fit, sizing, position, border and shadow |
| Connected content / embeds | Named action to the existing manager or canonical URL setting | Container sizing, spacing, position and appearance |
| About | Existing canonical title/story/image/link editor | Existing page/story layout workflow; no conflicting parallel About text store |

## Component parts

Supported part slots are declared in `core.PARTS`. Their overrides reuse `block.elements` with keys such as `part:image`; they are validated against the declared parts, not arbitrary DOM selectors. Part styling cannot reparent a part, attach user HTML, change a data-source owner or inject scripts. Permanent style hooks are rendered in canvas, preview and published HTML. Part typography takes precedence over whole-component defaults and reaches nested paragraphs. Background, padding, border and shadow controls for cards/callouts/quotes/details target their visible surface while retaining outer section spacing. Unknown part IDs, non-style ownership changes and unsafe media/attributes fail validation. Existing projects without part overrides keep their existing behavior.

Clicking a component image, heading or button selects that part. The part picker also reaches hidden/removed content. Removing heading/text hides that part; pressing Restore reverses it. Image-only removal retains the component and its text; Undo or a replacement restores the image. Reorder handles and arrows move the whole component; Move freely and Resize edit the selected part on the current device. The whole-component scope is named in the controls. Inspector transitions are disabled in the editing canvas so colour and size feedback is immediate; normal previews retain site styling.

## Original content and integrations

New inline text fields and media/embed attributes use named, offset-derived keys appended after existing f0/f1 fields, preserving saved draft field identities. Editing text segments preserves inline links and emphasis. Attribute values are escaped. Only a bounded allowlist of descriptions/accessibility attributes and link targets is accepted. New-tab links add noopener/noreferrer.

The Farm video now exposes direct source/poster and playback controls. Source-video overrides are optional validated `element.media`. Typed-video options use explicit true/false strings; old video blocks retain controls enabled and autoplay disabled. Autoplay forces mute for browser compatibility. Live patches synchronise playback flags without replacing the page document.

Homepage hero media, booking links, email, map/contact/rental/availability embeds retain their canonical settings keys. Their inspector exposes those settings or the correct content manager. Calendar feeds, generated wedding policy text and other managed collections retain their data owners. Reordering framed source images continues to move their frames/captions together. These are intentional component boundaries, not unsupported buttons; no staff editing action grants script or credential access.

## Verification

- `tests/component-controls.cjs`: capability inventory for 862 original descriptors on 25 routes and all 24 typed inserts; safe media/attribute validation; original inline-markup preservation; source-video controls; independent component-part appearance and removal/restoration; device isolation; private save/reload; immutable preview; real publisher handlers against an isolated Git adapter.
- `tests/component-pages.cjs`: actual layer-tree selection and inspector checks for all 820 original elements using the generic source inspector on 24 routes, plus About route loading. About's dedicated canonical content edit/save/publish path remains covered by `tests/site-editor-flow.cjs`.
- Guide 21 insertion/movement, theme readability, snapping and tool-mode regression tests remain required, as do existing recovery, concurrency, gallery/card integrity and atomic publishing checks.

Generated per-element/page evidence stays in ignored `tests/qa-*.json`. Tests never publish to the production repository or change staff designs. A local capability inventory alone is not presented as visual or browser verification. Full upstream Webstudio/Instatic platform parity and private team-storage provisioning are separate from this component-controls scope.
