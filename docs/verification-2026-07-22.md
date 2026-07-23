# Verification Record - 2026-07-22

## Environment

- Windows
- Zotero 9.0.5
- Plugin version 0.1.0
- Production API base: `https://www.fanyipaiban.com/translate/openapi/v1`

## Passed

- `npm run verify`
  - Prettier
  - ESLint
  - 8 unit tests
  - TypeScript
  - Production XPI build
- The XPI installs and is enabled in an isolated Zotero profile.
- Zotero calls the plugin bootstrap and logs `startup complete`.
- The Tools menu contains the translation and settings entries.
- Translation remains disabled when no supported PDF selection exists.
- The preference pane registers and renders in Chinese Zotero.
- Dark-mode colors, controls, balance panel, and status badges are readable.
- Dynamic connection status is localized.
- API key visibility controls expose localized accessible labels.
- An invalid production API key returns `401 INVALID_API_KEY` and the pane shows the failed state.
- The smoke-test key did not appear in logs, pending-job storage, source files, or generated assets.
- The generated update manifest SHA-512 hash matches the XPI.
- Plugin source text is valid UTF-8 without BOM.

## Website Integration

- Added Chinese and English Zotero product pages under `/zotero/` and `/en/zotero/`.
- Added homepage, developer documentation, MCP footer, sitemap, and `llms.txt` entry points.
- HTML, CSS, JSON-LD, local asset references, sitemap XML, and UTF-8 encoding checks passed.
- The local website page must still be deployed before the manifest homepage URL stops returning 404.

## Remaining Release Matrix

- Run a paid end-to-end task with a valid test API key and a small PDF.
- Verify translated PDF import.
- Verify comparison PDF and Markdown import.
- Verify insufficient-credits and recharge continuation with a controlled test account.
- Complete clean-profile checks on Zotero 7 and the supported Zotero 9 release.
- Complete macOS installation, settings, translation, and attachment-import checks.
- Create the public GitHub repository and publish the first tagged release.
- Deploy the website page, then verify all public release, update, policy, and support URLs.

## Known Repository-Level Validation Limitation

The existing `online-ppt-pucheng` production build did not complete within ten minutes and emitted no build error. A targeted Vue SFC parse/script/template compilation for the developer page passed. The repository-wide `vue-tsc` check still reports many pre-existing type errors across unrelated modules, so it is not a clean release gate for the Zotero deep-link change.
