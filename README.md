# ONLYOFFICE Offline 0.6.0 — unofficial Chromium extension

Run the real ONLYOFFICE document, spreadsheet and presentation editors locally in a Chromium browser, using a WebAssembly converter. This is an experimental, unofficial modified derivative, not an official ONLYOFFICE release.

## Download and install

Download **[ONLYOFFICE-Offline.zip from the latest release](https://github.com/anon-uk/onlyoffice-offline-extension/releases/latest)**. The separate `ONLYOFFICE-Offline-Source.zip` contains the integration source and build instructions; it is not the installable extension.

1. Extract `ONLYOFFICE-Offline.zip`.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the extracted `ONLYOFFICE Offline` folder containing `manifest.json`.
4. Pin the extension and click its ONLYOFFICE icon.

Keep the extracted folder; the browser loads the extension from it. To update, save your open documents, replace the old extracted folder with the new release, and click **Reload** on the extension card. Browser compatibility varies; the recorded checks used Chrome for Testing on macOS Apple Silicon. This project is not published in the Chrome Web Store.

## AI-assisted development disclosure

The extension-specific integration, offline workarounds, landing hub, packaging scripts, tests and documentation were substantially generated and revised with **OpenAI Codex**, an AI coding assistant, under the repository owner's direction. AI-assisted code review and automated/browser checks were used; these do not amount to an independent human security audit or a guarantee of correctness.

The original ONLYOFFICE editors, upstream browser adaptation and converter are third-party projects credited below. This disclosure concerns this repository's modifications and documentation, and does not characterize upstream authors' development practices. The extension's exposed workflow has no AI assistant or external AI service; document editing and conversion run locally.

## Supported workflow

- Open DOCX, XLSX, PPTX, ODT, ODS, ODP and RTF files, or create a document, spreadsheet or presentation.
- Use the native ONLYOFFICE formatting, tables, shapes and core spreadsheet/presentation controls, plus document comments and tracked changes.
- **Save** downloads a copy; it does not overwrite the original disk file.
- **Download As** offers PDF and the editor's Office format, plus ODT/RTF for documents, ODS for spreadsheets and ODP for presentations. Native format-loss warnings remain in place.
- Use the native header return icon or File-menu return control to return to the hub. Unsaved edits offer **Save and return**, **Discard changes** or **Cancel**.
- Each extension tab holds one editor. Click the extension icon to open another tab.

For printing, use the native Print control or Ctrl/Cmd+P. The extension renders a PDF locally and opens it in the browser's PDF viewer; use that viewer's Print button to select a printer or Save as PDF. Physical printer output has not been tested.

## Fonts

On the hub, choose **Use computer fonts** and grant Local Font Access permission. Where this API is unavailable or denied, use **Import font files** for TTF, OTF or TTC files. Imported files are remembered in the extension's local browser database; **Clear imported fonts** removes that remembered set.

No document font library is bundled. Actual font files exposed by the browser are used with their available styles; missing or unsupported faces use substitutes. Bitmap-only fonts, some platform-specific formats and files over 100 MB are skipped. Exact rendering requires a supported copy of the document's original font. Special engine/UI glyph resources remain part of ONLYOFFICE.

The first system-font scan reads metadata and can take time. Later tabs reuse validated metadata and picker previews. Full outlines load on demand through a 32 MB cache; one larger required file can exceed this limit, and the editor retains native font streams it uses. This is not a limit on total editor RAM. Click **Use computer fonts** again after replacing an installed font with the same name to refresh its metadata.

## Recent documents and local storage

Recent documents retain local copies of opened files and completed saves: at most 20 files, 200 MB total and 50 MB per file. They are snapshots, not live links to files on disk. Unsaved edits are not included. Remove individual entries or clear the list from the hub.

Document snapshots, imported fonts, font metadata and picker previews can remain in this extension's browser storage. Clearing browser data, changing profiles or removing the extension can remove remembered data. Keep downloaded copies of important documents. Autosave and crash recovery are not provided. This build does not send documents or font files to a document server or AI service.

## Limitations and validation

Spell checking, TXT/CSV export, image export, macros, external plugins/AI, cloud collaboration, sharing/server history, mail merge, signatures, comparison/combination and protection are disabled. The TXT encoding flow left the native editor behind a loading overlay in testing, so it is not exposed.

See [Validation.md](Validation.md) and [features-validation.json](features-validation.json) for the checks actually performed. The 0.6.0 workflow checks cover comments/revisions, PDF text, ODT/ODS/ODP/RTF export and reopen rendering, recent-document persistence, and Save/Discard/Cancel navigation. Earlier reports document the 0.5.0 font work. Complex files, every remaining ribbon control and other browser/OS combinations have not been exhaustively tested.

## Source, credits and licenses

Follow [BUILD.md](BUILD.md) to obtain the pinned upstream assets and build the extension. This repository and the source ZIP contain the modified integration and packaging source; the large generated editor binaries are distributed in the installable release ZIP.

The editors are **ONLYOFFICE**, developed by **Ascensio System SIA**, Copyright (C) 2012–2026. Original logos and copyright notices are retained. ONLYOFFICE is a trademark of Ascensio System SIA. This derivative is not affiliated with or endorsed by ONLYOFFICE.

- Editor source: [ONLYOFFICE/sdkjs](https://github.com/ONLYOFFICE/sdkjs) and [ONLYOFFICE/web-apps](https://github.com/ONLYOFFICE/web-apps).
- Browser adaptation: [agentbridges-ai/onlyoffice-browser](https://github.com/agentbridges-ai/onlyoffice-browser), pinned to `d15d12b6945be4d8b0f3aa1806120e740d2950ee`.
- Local converter: [agentbridges-ai/onlyoffice-x2t-wasm](https://github.com/agentbridges-ai/onlyoffice-x2t-wasm).
- Sval template interpreter: MIT licensed; see [SVAL-LICENSE](SVAL-LICENSE).

The integration modifications are distributed under **GNU AGPL v3**, with the full text in [LICENSE](LICENSE). Upstream components retain their original licenses, copyright notices and any additional terms. See [NOTICE.md](NOTICE.md), [FONT-NOTICE.md](FONT-NOTICE.md) and the upstream sources. Original work belongs to its respective authors; AI assistance does not replace those credits or licenses. No system font files or user documents are distributed in the releases.
