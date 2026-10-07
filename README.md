# ONLYOFFICE Offline 0.6.0 — unofficial Chrome extension

Real ONLYOFFICE document, spreadsheet and presentation editors, with the original core editing UI and a local WebAssembly converter. No document font library is bundled.

## Install or update

1. Extract `ONLYOFFICE-Offline.zip`.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the extracted `ONLYOFFICE Offline` folder containing `manifest.json`.
4. Pin the extension and click its ONLYOFFICE icon.

Save open documents before updating. Replace the old extracted folder with this release, then click **Reload** on its extension card. Keep the extracted folder; Chrome needs it.

## Fonts

On the start page, click **Use computer fonts** and grant Chrome access. The extension reads the actual installed font files exposed by Chrome, builds the native editor's font registry, style mappings, character fallback and picker previews, and supplies the converter with fonts required by the document. The first catalog build reads only metadata tables. Cached startup avoids requesting every font file again. Full outline files load on demand through a 32 MB cache (one larger required file can exceed that limit); the editor also retains font streams it has actually used. Font bytes stay local. Access is reused when Chrome retains permission; validated metadata and picker images are reused by later tabs. Newly listed fonts are scanned as needed. Click **Use computer fonts** again to refresh metadata after replacing an installed font with the same name.

If font access is denied or unavailable, choose **Import font files** and select TTF, OTF or TTC files. Imports are remembered locally in this extension's browser database. **Clear imported fonts** removes that remembered set. Imported faces include their real regular/bold/italic styles where present. No internet service is required.

Chrome cannot expose arbitrary browser-rendered font bytes through CSS alone. This workflow therefore needs Local Font Access permission or font files supplied by you. Bitmap fonts, some platform-specific outline formats and files over 100 MB are skipped; the start page lists skipped faces. Missing document fonts use available substitutes. Exact appearance requires a supported copy of the original font. Special UI/engine glyph resources remain part of ONLYOFFICE.

## Core workflow

Open DOCX, XLSX, PPTX, ODT, ODS, ODP or RTF, or create a document, spreadsheet or presentation. Each extension tab holds one file; click the extension icon for another tab. Formatting, font selection, tables, shapes and core spreadsheet/presentation tools use the native ONLYOFFICE UI.

**Save** downloads a copy. It does not overwrite the original file. Recent documents keep local copies of opened files and completed saves, up to 20 files and 200 MB total (50 MB per file). They are snapshots, not live links to the original disk files. Unsaved edits are not included; remove individual entries or clear the list from the hub. Autosave and crash recovery are not provided.

Image export, macros, cloud collaboration, sharing/history, external plugins/AI, mail merge, signatures, comparison/combination, protection and server-only controls are removed from the exposed workflow. Download As offers PDF and the editor’s native format, plus ODT/RTF for documents, ODS for spreadsheets and ODP for presentations. ONLYOFFICE’s format-loss dialogs remain in place.

This remains an experimental derivative. Complex files and every remaining ribbon command have not been exhaustively tested. See `Validation.md` for checks and limitations.

## Printing

Choose **Print** in the native File menu, use the native Print toolbar control, or press Ctrl/Cmd+P while editing. The extension renders paginated pages locally and opens a PDF in Chrome’s built-in viewer. Use that viewer’s Print button to choose a printer or Save as PDF. No document server is used. This print-preview path is separate from the restricted Download As menu.

## Source and attribution

This is not an official ONLYOFFICE release. ONLYOFFICE is a trademark of Ascensio System SIA. Original logos and notices are retained. See `LICENSE`, `NOTICE.md`, `FONT-NOTICE.md` and `SVAL-LICENSE`.

This repository contains the integration source, packaging scripts and validation scripts. See [BUILD.md](BUILD.md) to obtain the pinned editor assets and build the unpacked extension.

The landing hub now matches ONLYOFFICE’s flat header, sidebar and document icons, with light/dark colors following your system preference.

## Review and navigation

The native comments and tracked-changes tools are enabled for offline review. Use the native return icon in the editor header or the File-menu return control to return to the hub. Unsaved changes offer Save and return, Discard changes, or Cancel. Saving also downloads a copy; recent storage never overwrites the original disk file.

ONLYOFFICE editors are developed by Ascensio System SIA, Copyright (C) 2012–2026. The integration modifications are distributed under GNU AGPL v3; original ONLYOFFICE assets retain their copyright notices and logos. Browser adaptation: agentbridges-ai/onlyoffice-browser; converter: agentbridges-ai/onlyoffice-x2t-wasm. Sval retains its MIT notice. This is an unofficial modified derivative, not endorsed by ONLYOFFICE.

## Credits and license

The document, spreadsheet and presentation editors are **ONLYOFFICE**, developed by **Ascensio System SIA**. Copyright (C) Ascensio System SIA 2012–2026. Original ONLYOFFICE logos and copyright notices are retained. This project is an unofficial modified derivative and is not affiliated with or endorsed by ONLYOFFICE. ONLYOFFICE is a trademark of Ascensio System SIA.

Editor source: [ONLYOFFICE/sdkjs](https://github.com/ONLYOFFICE/sdkjs) and [ONLYOFFICE/web-apps](https://github.com/ONLYOFFICE/web-apps). Browser adaptation: [agentbridges-ai/onlyoffice-browser](https://github.com/agentbridges-ai/onlyoffice-browser), pinned to `d15d12b6945be4d8b0f3aa1806120e740d2950ee`. Local converter: [agentbridges-ai/onlyoffice-x2t-wasm](https://github.com/agentbridges-ai/onlyoffice-x2t-wasm). Credit belongs to their respective authors.

The integration modifications are distributed under **GNU AGPL v3**, with the full text in [LICENSE](LICENSE). Upstream components retain their original licenses, copyright notices and any additional terms; see [NOTICE.md](NOTICE.md) and the pinned upstream source. Sval is MIT licensed; its full notice is in [SVAL-LICENSE](SVAL-LICENSE). This repository supplies modified integration source and build instructions alongside links to the original editor and converter source. No system font files or user documents are distributed.
