# Privacy Notice

Last updated: 2026-07-22

FanyiPaiban PDF Translator is a Zotero desktop plugin that connects to the FanyiPaiban document translation service.

## Data processed

When a user explicitly starts a translation, the plugin sends the following data to `https://www.fanyipaiban.com/translate/openapi/v1`:

- The selected PDF file and its file name.
- Source language setting, normally `auto`.
- Target language setting.
- The user's FanyiPaiban API key in the HTTPS `Authorization` header.
- A random idempotency key used to prevent duplicate task creation.

The plugin also queries task status and account credits, and downloads the requested result files.

## Local storage

- The API key is stored in Zotero's local credential/password store.
- Translation preferences and pending task identifiers are stored in the local Zotero profile.
- The API key is not written to Zotero items, attachments, notes, ordinary plugin preferences, or plugin logs.
- Pending task data does not contain document contents.

## Zotero sync

The plugin does not intentionally place credentials or pending task state in Zotero-synced item data. Result files imported as Zotero attachments may be synchronized by Zotero according to the user's Zotero sync settings.

## Payments

Payments are not processed inside the plugin. Recharge actions open the official FanyiPaiban website in the user's browser. Payment processing is governed by the FanyiPaiban [Privacy Policy](https://fanyipaiban.com/privacy-policy/), [Terms of Service](https://fanyipaiban.com/terms-of-service/), and [Refund Policy](https://fanyipaiban.com/refund-policy/).

## Contact

- Email: 124005421@qq.com
- WeChat: `melevelalk`, `nj-juhuizhineng`
