# SecretMask

A small Next.js app for masking and unmasking sensitive values embedded in regular text.

## Features

- Manage a list of secret key/value pairs
- Mask secret values in unredacted text with placeholders such as `[API_KEY]`
- Restore redacted text back to its original unredacted form
- Persist saved secret mappings in local browser storage for reuse

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in the browser.

## Project structure

- `app/page.js` — the interactive SecretMask interface
- `app/layout.js` — site metadata and root layout
- `app/globals.css` — global styling
