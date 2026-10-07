# ONLYOFFICE Offline — unofficial Chromium extension

Real ONLYOFFICE document, spreadsheet and presentation editors, with the original core editing UI and a local WebAssembly converter. No document font library is bundled.

## Install or update

1. Extract a built `ONLYOFFICE-Offline.zip` (see [BUILD.md](BUILD.md) to build it).
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the extracted `ONLYOFFICE Offline` folder containing `manifest.json`.
4. Pin the extension and click its ONLYOFFICE icon.

Save open documents before updating. Replace the old extracted folder with this release, then click **Reload** on its extension card. Keep the extracted folder; Chrome needs it.

## Fonts

On the start page, click **Use computer fonts** and grant Chrome access. The extension reads the actual installed font files exposed by Chrome, builds the native editor's font registry, style mappings, character fallback and picker previews, and supplies the converter with fonts required by the document. The first catalog build reads only metadata tables. Cached startup avoids requesting every font file again. Full outline files load on demand through a 32 MB cache (one larger required file can exceed that limit); the editor also retains font streams it has actually used. Font bytes stay local. Access is reused when Chrome retains permission; validated metadata and picker images are reused by later tabs. Newly listed fonts are scanned as needed. Click **Use computer fonts** again to refresh metadata after replacing an installed font with the same name.

If font access is denied or unavailable, choose **Import font files** and select TTF, OTF or TTC files. Imports are remembered locally in this extension's browser database. **Clear imported fonts** removes that remembered set. Imported faces include their real regular/bold/italic styles where present. No internet service is required.

Chrome cannot expose arbitrary browser-rendered font bytes through CSS alone. This workflow therefore needs Local Font Access permission or font files supplied by you. Bitmap fonts, some platform-specific outline formats and files over 100 MB are skipped; the start page lists skipped faces. Missing document fonts use available substitutes. Exact appearance requires a supported copy of the original font. Special UI/engine glyph resources remain part of ONLYOFFICE.

## Core workflow

Open DOCX, XLSX or PPTX, or create a document, spreadsheet or presentation. Each extension tab holds one file; click the extension icon for another tab. Formatting, font selection, tables, shapes and core spreadsheet/presentation tools use the native ONLYOFFICE UI.

**Save** downloads a copy. It does not overwrite the original file. Autosave and crash recovery are not provided.

PDF/image/alternate-format export, macros, cloud collaboration, sharing/history, external plugins/AI, mail merge, signatures, comparison/combination, protection and server-only controls are removed from the exposed workflow. Download As offers only the current editor's DOCX, XLSX or PPTX format.

This remains an experimental derivative. Complex files and every remaining ribbon command have not been exhaustively tested. See `Validation.md` for checks and limitations.

## Printing

Choose **Print** in the native File menu, use the native Print toolbar control, or press Ctrl/Cmd+P while editing. The extension renders paginated pages locally and opens a PDF in Chrome’s built-in viewer. Use that viewer’s Print button to choose a printer or Save as PDF. No document server is used. This print-preview path is separate from the restricted Download As menu.

## Source and attribution

This is not an official ONLYOFFICE release. ONLYOFFICE is a trademark of Ascensio System SIA. Original logos and notices are retained. See `LICENSE`, `NOTICE.md`, `FONT-NOTICE.md` and `SVAL-LICENSE`.

This repository contains integration source, packaging scripts, pinned upstream references and validation scripts.

The landing hub now matches ONLYOFFICE’s flat header, sidebar and document icons, with light/dark colors following your system preference.

## Build from source

This repository contains the extension integration and modifications to a pinned upstream checkout. Follow [BUILD.md](BUILD.md) to obtain the engine assets and reproduce the build. Large generated editor assets are obtained from the pinned upstream checkout rather than stored in Git.

## Credits and license

The document, spreadsheet and presentation editors are **ONLYOFFICE**, developed by **Ascensio System SIA**. Copyright (C) Ascensio System SIA 2012–2026. Original ONLYOFFICE logos and copyright notices are retained. This project is an unofficial modified derivative and is not affiliated with or endorsed by ONLYOFFICE. ONLYOFFICE is a trademark of Ascensio System SIA.

Editor source: [ONLYOFFICE/sdkjs](https://github.com/ONLYOFFICE/sdkjs) and [ONLYOFFICE/web-apps](https://github.com/ONLYOFFICE/web-apps). Browser adaptation: [agentbridges-ai/onlyoffice-browser](https://github.com/agentbridges-ai/onlyoffice-browser), pinned to `d15d12b6945be4d8b0f3aa1806120e740d2950ee`. Local converter: [agentbridges-ai/onlyoffice-x2t-wasm](https://github.com/agentbridges-ai/onlyoffice-x2t-wasm). Credit belongs to their respective authors.

The integration modifications are distributed under **GNU AGPL v3**, with the full text in [LICENSE](LICENSE). Upstream components retain their original licenses, copyright notices and any additional terms; see [NOTICE.md](NOTICE.md) and the pinned upstream source. Sval is MIT licensed; its full notice is in [SVAL-LICENSE](SVAL-LICENSE). This repository supplies modified integration source and build instructions alongside links to the original editor and converter source. No system font files or user documents are distributed.
