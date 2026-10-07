ONLYOFFICE Offline 0.6.0 — unofficial derivative

ONLYOFFICE is a trademark of Ascensio System SIA. This extension is not an
official ONLYOFFICE release. Original logos and copyright notices are retained.

Real editor assets: ONLYOFFICE web-apps / sdkjs, version 9.3, AGPL-3.0.
https://github.com/ONLYOFFICE/web-apps
https://github.com/ONLYOFFICE/sdkjs
Browser integration: https://github.com/agentbridges-ai/onlyoffice-browser
Pinned revision d15d12b6945be4d8b0f3aa1806120e740d2950ee, LICENSE included.
Converter source: https://github.com/agentbridges-ai/onlyoffice-x2t-wasm

No document font library is distributed with this release. Document font bytes
come from Chrome's Local Font Access API with user permission, or from files
selected by the user. System font bytes stay in the tab's memory. Imported fonts
can be remembered in this extension's local browser database and cleared from
its start page. No font bytes are fetched from the internet or uploaded. Original
engine/UI resources retain their embedded special glyphs and notices.

Sval template interpreter: MIT, SVAL-LICENSE included.
The integration and packaging modifications are distributed under AGPL-3.0.
Corresponding integration source and build instructions accompany the release.

Changes: local recent-document snapshots, native back-to-hub controls, offline comments and tracked changes, expanded local formats, offline extension entry point, CSP adaptation, local converter,
permission-based system font access, font-file import, per-tab font catalogs, metadata-only enumeration, on-demand outline loading, bounded font cache, persistent metadata and preview caches, corrected regular-weight preference, coalesced UI policy scans, local paginated PDF print previews,
SFNT metadata/style/Unicode fallback generation, bounded converter font sets,
corrected font picker name lookup, core-only menu policy, disabled
macros, and validated Office/OpenDocument/RTF input/export and PDF download. Native editor UI is retained for the core
workflow.

AI-assisted development disclosure: this derivative’s extension integration,
offline workarounds, hub, packaging, tests and documentation were substantially
generated and revised using OpenAI Codex under the repository owner’s direction.
Original ONLYOFFICE and other upstream work remains credited to its authors.
AI-assisted reviews and recorded tests are not an independent human audit.
