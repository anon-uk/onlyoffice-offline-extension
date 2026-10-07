# Build source

Use Node 24, pnpm 11 and Python 3.9 or newer. Node and Python must be on PATH. Run from a directory with this archive's `work/` layout.

From the root of your clone of this repository:

1. Clone the upstream runtime to a temporary directory: `git clone https://github.com/agentbridges-ai/onlyoffice-browser.git work/upstream-runtime`.
2. In that directory, run `git checkout d15d12b6945be4d8b0f3aa1806120e740d2950ee`, then return to the repository root.
3. Overlay this repository’s modifications: `cp -R work/onlyoffice-browser/. work/upstream-runtime/`.
4. Move the original overlay aside: `mv work/onlyoffice-browser work/integration-overlay`, then `mv work/upstream-runtime work/onlyoffice-browser`.
5. In `work/onlyoffice-browser`, run `pnpm install --frozen-lockfile`, then `pnpm exec vite build -c vite.extension.config.ts`.
6. Return to the repository root and run `node work/package-extension.mjs`.
7. Load `work/onlyoffice-browser/extension-build-v0.5` unpacked in Chrome. To make an install ZIP, zip that directory with its contents under a single folder named `ONLYOFFICE Offline`.

These preparation commands are for a fresh clone; do not repeat them over an already prepared build tree.

No font repository or generated document font library is needed. The integration generates native font metadata, selection databases, Unicode fallback and preview sprites at runtime from Chrome Local Font Access or user imports. Validated metadata and preview bitmaps are cached across tabs. Use computer fonts refreshes fingerprints after font updates. Only metadata tables are read to build a new catalog; full outlines load lazily through a bounded cache. Per-tab font assets are passed to conversion workers as local Blobs. The packager creates original ONLYOFFICE icons, repairs sprites, externalizes scripts, applies CSP-compatible template interpretation/precompilation, and removes service-dependent controls. Original source notices remain.

Browser validation scripts use Playwright and Chrome for Testing at `work/browsers/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`. Adjust the executable/profile paths for your platform. Automated font permission grants apply only to isolated test profiles. For `verify-font-fallback.cjs`, provide four Liberation Serif font files at `work/test-fonts/Serif.ttf`, `Serif-Bold.ttf`, `Serif-Italic.ttf` and `Serif-BoldItalic.ttf`; font files are not distributed in this archive.

`verify-print-pdfs.py` checks generated page counts and text (requires Python `pypdf`).

`verify-lazy-fonts.cjs` additionally checks outline cache size, renderer RSS, native Print controls and generated PDF files.

Original engine source: https://github.com/ONLYOFFICE/sdkjs and https://github.com/ONLYOFFICE/web-apps. Converter source: https://github.com/agentbridges-ai/onlyoffice-x2t-wasm. See NOTICE.md and included licenses.
