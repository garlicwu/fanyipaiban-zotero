# FanyiPaiban PDF Translator for Zotero

Translate complete PDF attachments from Zotero with the FanyiPaiban document translation API. The translated PDF keeps the source layout and is attached back to the same Zotero item.

Supported Zotero versions: 7 through 9.

Product page and setup guide: [LingoBridge Zotero PDF Translator](https://fanyipaiban.com/en/zotero/).

## Features

- Translate a selected PDF attachment or an item with exactly one local PDF.
- Detect the source language automatically and translate to Simplified Chinese by default.
- Configure another default target language in Zotero Settings.
- Store the API key in Zotero's local credential store instead of normal synced preferences.
- Display available and reserved credits before submission.
- Handle insufficient credits with an official recharge link and balance refresh.
- Poll asynchronous tasks and resume accepted tasks after Zotero restarts.
- Attach the translated PDF and optionally the comparison PDF and Markdown result.
- Upload files from disk without loading the whole PDF into JavaScript memory.

## Install

1. Download the latest `.xpi` file from Releases.
2. In Zotero, open **Tools > Add-ons**.
3. Choose **Install Add-on From File** and select the `.xpi` file.
4. Open **Settings > FanyiPaiban PDF Translator** and configure an API key.

API keys and credits are managed at [FanyiPaiban Developer Center](https://www.fanyipaiban.com/poly/developer-api?view=keys&source=zotero).

## Use

1. Select a local PDF attachment in Zotero.
2. Right-click and choose **Translate PDF with FanyiPaiban**.
3. Confirm the target language and current credit balance.
4. Keep Zotero open while the task is being submitted. Accepted tasks are saved locally and can resume after restart.

The plugin always downloads the translated PDF. Comparison PDF and Markdown attachments are optional settings.

## Billing

Translation uses the same credits balance as the FanyiPaiban workbench and public API. The server is the authority for the billable page count and final charge. Failed server-side translation tasks follow the platform's existing release/refund rules.

## Privacy

The selected PDF, file name, target language, and API key authentication are sent to the FanyiPaiban API only when the user explicitly starts a translation. See [PRIVACY.md](PRIVACY.md).

## Support

Customer service and technical support: [124005421@qq.com](mailto:124005421@qq.com)

## Development

Node.js 22.8 or newer is required by the Zotero plugin build toolchain.

```bash
npm install
npm run build
```

For live Zotero development, copy `.env.example` to `.env`, configure a dedicated Zotero profile, and run:

```bash
npm start
```

Run all local checks with:

```bash
npm run verify
```

## Release

Tag a release such as `v0.1.0`. The GitHub workflow builds the XPI and update manifest. Before public submission, complete [docs/marketplace-submission.md](docs/marketplace-submission.md).
