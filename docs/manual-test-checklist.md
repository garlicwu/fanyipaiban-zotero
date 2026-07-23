# Manual Test Checklist

## Installation and settings

- Install the XPI in a clean Zotero profile.
- Confirm the preference pane opens in Chinese and English Zotero interfaces.
- Save, replace, and remove an API key.
- Restart Zotero and confirm the key remains available without appearing in normal preferences.
- Test valid, invalid, revoked, and expired API keys.
- Confirm Simplified Chinese is the initial target language.
- Change the target language and confirm it persists locally.
- Confirm the official key-management, recharge, privacy, terms, and refund links open correctly.

## Translation

- Translate a normal local PDF attachment.
- Translate a parent item containing exactly one local PDF.
- Select a parent item containing multiple PDFs and confirm the plugin asks for a specific attachment.
- Test a linked PDF whose local file is missing.
- Test a large PDF and confirm upload progress updates without excessive memory growth.
- Confirm only one local translation pipeline runs at a time.
- Confirm the translated PDF is attached to the original parent item.
- Enable comparison PDF and Markdown and confirm all selected outputs are attached.

## Reliability and billing

- Interrupt a create request and confirm retry reuses the original idempotency key.
- Trigger insufficient credits and verify required, available, and shortage values.
- Recharge, refresh the balance, and confirm the new submission uses a new idempotency key.
- Restart Zotero while a submitted task is running and confirm polling resumes.
- Simulate task failure and confirm the plugin reports the server error and refreshes the balance.
- Interrupt a result download and confirm no incomplete attachment is imported.

## Release

- Run `npm run verify` from a clean checkout.
- Install the exact release XPI, not the source proxy.
- Verify the update manifest and XPI download URLs over HTTPS.
