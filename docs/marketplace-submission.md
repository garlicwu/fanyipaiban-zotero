# Marketplace Submission Checklist

## Immutable identity

- Plugin ID: `fanyipaiban@fanyipaiban.com`
- Package name: `fanyipaiban-zotero`
- Display name: `FanyiPaiban PDF Translator`
- Minimum Zotero version: `7.0`

Do not change the plugin ID after the first public release.

## Publication prerequisites

- Publish the public repository at `https://github.com/garlicwu/fanyipaiban-zotero`.
- Use the public GitHub repository as the temporary homepage until `https://www.fanyipaiban.com/zotero/` is deployed.
- Ensure the privacy, terms, refund, developer console, key management, and recharge URLs are publicly reachable.
- Create a signed or release-ready XPI from a clean tag.
- Publish `update.json` and verify the manifest `update_url` can be fetched without authentication.
- Prepare screenshots for Windows and macOS: settings, context menu, progress, completed attachments, and insufficient-credits dialog.
- Complete `docs/manual-test-checklist.md` on Zotero 7 and the current Zotero 9 release supported by the manifest.

## Suggested listing copy

**Short description**

Translate complete PDF attachments in Zotero, preserve the original layout, and attach translated, comparison, and Markdown results back to the same item.

**Permissions and remote service disclosure**

This plugin uses the remote FanyiPaiban document translation service. Translation requires a FanyiPaiban account, API key, and sufficient credits. The selected PDF is uploaded only after explicit user confirmation.

## Release procedure

1. Update `package.json` and `CHANGELOG.md`.
2. Run `npm ci` and `npm run verify`.
3. Install the generated XPI into a clean Zotero profile.
4. Create and push a signed `vX.Y.Z` tag.
5. Verify the GitHub Release assets and update manifest.
6. Submit the release URL, source URL, privacy URL, and support URL to the target plugin marketplace.
