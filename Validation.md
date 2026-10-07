# Validation — ONLYOFFICE Offline 0.6.0

Chrome for Testing 148 on macOS Apple Silicon, using isolated profiles. HTTP/HTTPS requests blocked throughout editor workflow tests. Automated font permission grants were confined to the isolated profiles.

- Installed font metadata obtained through Chrome Local Font Access; full outline files loaded only on demand; catalog family names checked against the running native editor resolver.
- DOCX, XLSX and PPTX created, edited with installed Times New Roman, downloaded through native Save and reopened offline. The document's selected font was checked after reopening.
- Document sample includes Latin, Greek, Cyrillic, Arabic and Chinese, selected through visible Select All and formatted bold/italic. Exported OOXML checked for actual text, family and style persistence; spreadsheet cell and presentation slide fonts checked too.
- Native File menus checked for OOXML-only export. Print uses the native document renderer and a local converter, then opens Chrome’s PDF viewer. DOCX, XLSX and PPTX generated printable PDFs, whose pages were checked for text and visual rendering; physical printer output was not tested. No page errors or failed asset requests in these workflows. Font-picker preview and document rendering visually inspected.
- Denied font permission leaves editing gated until usable fonts exist. Invalid font rejected. Four imported Liberation Serif styles worked, survived reload, and saved with correct bold/italic metadata.
- Import fallback also works when the Local Font Access API is absent. Clearing remembered fonts disables editing on the start page and removes the cache. Clearing another tab's remembered imports does not break an already open document or its Save operation.
- Variable named-instance metadata checked for Skia, STIX Two Text and Noto Sans Syriac. The lazy-loading extension additionally exercised Skia bold/italic selection, DOCX save and reopen.
- Metadata-only startup retains zero outline files. Runtime outline cache measured about 32 MB for the document and 11 MB for the spreadsheet, compared with 685 MB retained by the previous build. Cache eviction does not remove native font streams already used by an open editor. One required file larger than 32 MB may exceed the cache limit. Renderer RSS and JavaScript heap samples are recorded; they are platform/time-specific and not a guaranteed memory ceiling.
- TypeScript, malformed-font bounds checks and diff whitespace checks passed. Release archives checked for CRC integrity and manifest/icon consistency.

Machine-specific results are included in `validation.json`, `import-validation.json` and `variable-validation.json`. The available catalog depends on the user's computer. System font bytes are not included in these reports or the release.

Bitmap-only fonts and platform-specific fonts without standard outlines use available substitutes. Exact color emoji, every variable-font axis/style, every language, every remaining ribbon command, complex documents, other operating systems and other Chrome versions have not been exhaustively validated. Imports over 100 MB are skipped. The first catalog build or explicit refresh still takes time; later tabs reuse metadata and preview caches. Complex documents, images, used native font streams and conversion workers can increase memory beyond the outline cache. Imported picker previews draw one family at a time and release the temporary browser FontFace; document rendering uses the independent lazy loader.

## Font and performance follow-up

Avenir Next Condensed was reproduced selecting Medium in the normal-text slot. Regular now takes priority over Medium/Book, while bold and italic use their corresponding faces. Font metadata and picker images are cached locally. The cache is reused for unchanged enumerated names; explicit Use computer fonts refreshes source-table fingerprints. Full document outlines still load lazily. Menu-policy scans are coalesced per animation frame and ignore text-only DOM updates. The user’s screenshots have different zoom settings (Word 110%, extension 70%); this fix addresses face selection rather than claiming pixel-identical rasterization. Exact comparison of the essay’s formatting would require its DOCX. A fresh isolated run prepared the catalog in about 53 seconds; subsequent font preparation measured 50–102 ms with all 526 entries cached and zero metadata table reads. These are font-setup timings, not full editor startup times. Idle renderer task samples were about 25–87 ms over a three-second interval.

- Landing hub checked in light and dark themes at 1440 px and 390 px widths: no horizontal overflow, all original document icons loaded, font gating/import and opening a new document passed with no page errors. UI uses ONLYOFFICE flat header/sidebar styling and original document icons.

## Added in 0.6.0

- Recent documents store bounded local file snapshots in IndexedDB (20 files, 200 MB total, 50 MB per file). Opened files and completed saves can be reopened after reload; unsaved edits are not snapshots. Removal and clearing are exposed in the hub.
- The editor's original header return button and File-menu return control route back to the hub. Dirty documents show Save and return / Discard changes / Cancel; teardown removes the editor frames and clears the per-document set of fonts used for conversion.
- Native comments and tracked insertions are enabled. DOCX round trips preserve the comment text and inserted revision; accepting revisions is checked separately.
- Native PDF download uses the validated local print renderer. OpenDocument and RTF paths are exposed only after native export and reopen checks.
- TXT/CSV export remains disabled: the TXT encoding path left the native editor behind a loading overlay. Spell checking still needs a verified local spell-service bridge; macros, service-dependent collaboration, cloud history, mail merge, comparison, protection and external plugins remain disabled.
- The new hub and recent rows retain the original ONLYOFFICE logo/document icons and flat controls; the return control uses the actual native header button. Dark and narrow-window layouts were inspected.

The earlier font, print and import reports document 0.5.0 checks; the font implementation is unchanged except clearing the used-font set on editor teardown. The new workflow checks are recorded in `features-validation.json`.
